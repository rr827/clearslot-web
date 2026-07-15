# ClearSlot Launch Runbook

Execute top to bottom in one sitting. Production blockers first. Every command is copy-pasteable — fill in the bracketed placeholders from the Supabase and Vercel dashboards.

---

## 1. Resolve the Supabase table mismatch (blocks everything else)

**What is wrong:** the code writes to `rooms`, `waitlist_members`, `waitlist_referral_credits`, and `room_notification_targets`. An earlier manual check of production only showed `rooms` and `waitlist`. Until this is resolved, RLS status on the tables the app actually uses is unverified.

**Where to fix it:** Supabase dashboard → your project → Table Editor.

**Steps:**
1. Confirm which Supabase project the app's `NEXT_PUBLIC_SUPABASE_URL` env var points to in Vercel (Vercel dashboard → clearslot-web → Settings → Environment Variables → Production).
2. Open that exact project in the Supabase dashboard and check Table Editor. Confirm whether `waitlist_members`, `waitlist_referral_credits`, and `room_notification_targets` exist.
3. If they're missing, the waitlist and notification features have been failing silently in production — check Vercel function logs for `/api/waitlist` and `/api/room/notifications/register` for insert errors.
4. If they exist under different names than expected, no action needed — `docs/supabase-production-rls.sql` already checks for existence with `to_regclass` before touching each table.

**How to verify it worked:** Table Editor shows all four tables (`rooms`, `waitlist_members`, `waitlist_referral_credits`, `room_notification_targets`) in the same project referenced by `NEXT_PUBLIC_SUPABASE_URL`.

**Risk if skipped:** every other step in this runbook may be run against the wrong database.

---

## 2. Apply the RLS migration

**What is wrong:** RLS was enabled manually earlier via ad hoc SQL against possibly the wrong table names. `docs/supabase-production-rls.sql` is now the canonical, idempotent version covering all real tables.

**Where to fix it:** Supabase dashboard → your project (confirmed in step 1) → SQL Editor → New query.

**Steps:**
1. Open `docs/supabase-production-rls.sql` in this repo.
2. Paste the entire contents into a new Supabase SQL Editor query.
3. Run it. It only touches tables that exist (`to_regclass` guard), drops legacy public/anon-exposed policies, drops the `signup_ip` column if present, and installs a service-role-only policy on each table.
4. Re-run it any time a new production table is added — it's safe to run repeatedly.

**How to verify it worked:** run this query and confirm every listed table shows `rowsecurity = true`:
```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('rooms', 'waitlist', 'waitlist_members', 'waitlist_referral_credits', 'room_notification_targets');
```

**Risk if skipped:** anonymous clients can read or write room and waitlist data directly via the Supabase REST API.

---

## 3. Verify anon access is blocked via the live REST endpoint

**Where to fix it:** N/A — verification only. Get `PROJECT_REF` and `ANON_KEY` from Supabase dashboard → Settings → API.

**Steps — run each and inspect the response:**
```bash
curl -s "https://<PROJECT_REF>.supabase.co/rest/v1/rooms?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"

curl -s "https://<PROJECT_REF>.supabase.co/rest/v1/waitlist_members?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"

curl -s "https://<PROJECT_REF>.supabase.co/rest/v1/waitlist_referral_credits?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"

curl -s "https://<PROJECT_REF>.supabase.co/rest/v1/room_notification_targets?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

**How to verify it worked:** every response is `[]` or a permission-denied error (e.g. `{"code":"42501",...}`). Any response containing a data row is a failed check — stop and re-run step 2.

**Risk if skipped:** unverified RLS is the single highest-severity gap in the whole audit.

---

## 4. Confirm required secrets are set in Vercel Production

**Where to fix it:** Vercel dashboard → clearslot-web → Settings → Environment Variables → Production.

**Steps — confirm each of these exists with a real value (not blank, not a placeholder):**
1. `CRON_SECRET` — the cleanup endpoint now returns 503 if this is unset, so cleanup silently stops running if missing.
2. `WAITLIST_CONFIRM_SECRET` — confirm tokens are now forged-proof only if this is set; the code throws if it's missing, so confirmation emails will 500 without it.
3. `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — bot protection on the waitlist silently no-ops if either is missing.
4. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — without these, rate limiting falls back to per-function-instance memory, which is not effective across Vercel's multiple concurrent instances.
5. `GOOGLE_CLIENT_SECRET` — confirm the Production value is an actual client secret (Google secrets do not end in `.apps.googleusercontent.com`; that suffix means a Client ID was pasted into the secret field by mistake). This was found wrong in the local `.env.local` dev file — check Production separately since it's a different value.

**How to verify it worked:** each variable listed above shows a value in the Vercel dashboard for the Production environment (values are masked, but presence and non-empty status are visible).

**Risk if skipped:** waitlist confirmation, cron cleanup, or bot protection can silently degrade to insecure or broken behavior in production with no user-facing error.

---

## 5. Decide the cleanup cron frequency

**What is wrong:** `vercel.json` currently runs `/api/cron/cleanup-rooms` once daily (`0 3 * * *`). An hourly schedule was tried and reverted because Vercel's Hobby plan only supports daily cron jobs. This means expired rooms can persist up to ~24 hours past their stated 48-hour expiry before the row is actually deleted (they're already inaccessible to the app well before that — this is a data-persistence gap, not a data-exposure gap, since RLS blocks anon reads regardless).

**Where to fix it:** Vercel dashboard → clearslot-web → Settings → General (plan) — only if you choose to upgrade.

**Steps (pick one):**
1. **Accept the current daily schedule.** No action — rooms remain correctly inaccessible to users after 48h; only the underlying row deletion lags by up to ~24h behind. Acceptable since RLS keeps that data unreadable by anyone but the service role in the interim.
2. **Upgrade to Vercel Pro** to unlock finer cron granularity, then change `vercel.json`'s schedule back to `"0 * * * *"` (hourly) and redeploy.
3. **Keep Hobby, move cleanup to an external scheduler** (e.g. a GitHub Actions workflow or a third-party cron service) that calls `https://www.clearslot.net/api/cron/cleanup-rooms` hourly with the `Authorization: Bearer <CRON_SECRET>` header.

**How to verify it worked:** `curl -s https://www.clearslot.net/api/cron/cleanup-rooms -H "Authorization: Bearer <CRON_SECRET>"` returns `{"ok":true,"deleted":<n>}`.

**Risk if skipped:** low — this is a defense-in-depth gap, not an access-control gap.

---

## 6. Live security header check

**Steps:**
```bash
curl -sI https://www.clearslot.net
```

**How to verify it worked:** response includes `content-security-policy` (not `-report-only`), `strict-transport-security: max-age=31536000; includeSubDomains; preload`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `x-content-type-options: nosniff`.

**Risk if skipped:** headers could differ from local config due to a caching layer or misconfigured deploy.

---

## 7. Incognito product-loop pass

Run all of these in a single private/incognito window, in order:

1. Create a room → connect Google Calendar → confirm the OAuth consent screen shows no "unverified app" warning → confirm availability renders as busy/free blocks only, no event titles.
2. Create a second room using manual availability entry, no calendar connection at all.
3. Open the first room's invite link in a separate incognito window with zero sign-in, mark availability, propose a time, and confirm it from the other participant's session.
4. Download the confirmed slot as `.ics` and import it into Google Calendar, Apple Calendar, and Outlook — confirm it imports cleanly in all three.
5. Visit a made-up 6-character room code (e.g. `/room/ZZZZZZ`) → confirm a graceful "This room link is no longer active" page with a "Start a new room" button, not a blank or crashed page.
6. Start the Google OAuth connect flow and click "Cancel" on Google's consent screen → confirm you land back on `/connect` with a clear error state, not a crash.
7. Paste a real room invite link into iMessage, WhatsApp, Slack, and Discord → note that no preview image renders (expected — no OG image exists yet; this is a known Phase B gap, not a regression).
8. Repeat steps 1–3 on Safari iOS and Chrome Android.

**Risk if skipped:** these are the only remaining checks that can't be verified from source; a real regression here would only surface in production traffic.

---

## Known deferred item (do not re-open without a plan)

**Concurrent proposal accept/decline race** — `lib/room.ts` now rejects an accept/decline if the proposal is no longer `pending` (returns 409), which closes the case where one request completes before a later one arrives. It does **not** close true simultaneous races: two requests that both read the room row as `pending` before either write commits can still both succeed, since `updateProposals` is a full-array read-modify-write with no transaction or optimistic lock. `docs/pressure-test-audit.md` (P1) has the recommended fix: move to a Postgres RPC function that performs the read-check-write inside one transaction. This should land before Stripe/premium (Phase C) — accepting duplicate confirmations is a correctness problem once money is involved, but is low-stakes pre-payment.

Room code entropy (30 bits, 6 chars) was reviewed and accepted for the initial launch scale given per-IP rate limiting on lookups; revisit only if abuse patterns appear or before a large distribution push (per `docs/pressure-test-audit.md`).
