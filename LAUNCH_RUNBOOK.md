# ClearSlot Launch Runbook

Execute top to bottom in one sitting. Production blockers first. Every command is copy-pasteable — fill in the bracketed placeholders from the Supabase and Vercel dashboards.

---

## 1–3. Supabase table mismatch, RLS migration, anon access — RESOLVED 2026-07-17

**What was wrong:** the code writes to `rooms`, `waitlist_members`, `waitlist_referral_credits`, and `room_notification_targets`. Production (`sqfjpjqktqvrbwkyjwrz`) only had `rooms`, `waitlist`, and `room_notification_targets` — `waitlist_members`, `waitlist_referral_credits`, and the `decrement_waitlist_position` RPC did not exist at all. This meant **every waitlist signup attempt had been failing silently since the referral/confirm system was built** — the insert hit a table that didn't exist, threw a Postgres error, and the route returned a generic 500. The old `waitlist` table is an unrelated 3-column stub (`id`, `email`, `joined_at`) with 0 rows — no data was at risk.

**What was done:**
1. Verified via direct Supabase MCP query (`list_projects`, `list_tables`) that the app's `NEXT_PUBLIC_SUPABASE_URL` and the Vercel Production env var both point to the same project (`sqfjpjqktqvrbwkyjwrz`).
2. Applied `docs/supabase-waitlist-schema.sql` — creates `waitlist_members`, `waitlist_referral_credits`, and `decrement_waitlist_position`, matching the exact columns the code already reads/writes.
3. Re-ran `docs/supabase-production-rls.sql` — enabled RLS and installed `service_role`-only policies on all five tables.
4. Verified directly via SQL: all five tables show `rls_enabled: true`; `pg_policies` shows only `*_service_role_only` policies scoped to `{service_role}`; `information_schema.role_table_grants` returns zero rows for `anon`/`authenticated` on any public table; `decrement_waitlist_position` is present in `information_schema.routines`.

**Remaining manual step:** do one real end-to-end waitlist signup at clearslot.net/waitlist with an email you control — submit, confirm the email arrives, click confirm, verify you land on the confirmed page with a position number. This is the one part of the fix that can't be verified from the database alone (it depends on the live Resend send). Fold this into step 7 below.

**Risk if skipped:** none remaining for RLS — this is verified. The only open risk is not yet having done a live signup smoke test.

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

## 5. Schedule hourly cleanup via Upstash QStash

**What is wrong:** `vercel.json` runs `/api/cron/cleanup-rooms` once daily (`0 3 * * *`) because Vercel's Hobby plan doesn't support finer cron granularity. Rooms are already inaccessible to users the instant they pass 48 hours (`lib/room.ts` enforces this on every read, and now also opportunistically deletes any expired row it encounters — see commit `4e6d58a`). The only remaining gap is rooms that expire and are never revisited by anyone — those still wait for a sweep. This step closes that by scheduling the same cleanup endpoint hourly through Upstash, which is already in the stack for rate limiting, instead of paying for Vercel Pro.

**Where to fix it:** Upstash dashboard → your Redis project's account → QStash → Schedules → Create Schedule.

**Steps:**
1. Go to the Upstash console → QStash → Schedules.
2. Create a new schedule with:
   - **Destination URL:** `https://www.clearslot.net/api/cron/cleanup-rooms`
   - **Cron expression:** `0 * * * *` (hourly)
   - **HTTP Method:** GET
   - **Headers:** `Authorization: Bearer <CRON_SECRET>` (same value as the Vercel env var from step 4)
3. Save the schedule. Leave the existing Vercel daily cron entry in `vercel.json` as-is — it's a harmless, free backstop if QStash is ever paused or misconfigured.

**How to verify it worked:** in the Upstash QStash dashboard, check the schedule's delivery log after the first hour passes — it should show a `200` response with a body like `{"ok":true,"deleted":<n>}`. You can also trigger it manually with:
```bash
curl -s https://www.clearslot.net/api/cron/cleanup-rooms -H "Authorization: Bearer <CRON_SECRET>"
```

**Risk if skipped:** low — this is a defense-in-depth gap, not an access-control gap. Abandoned expired rooms wait up to ~24h for the Vercel daily sweep instead of ~1h; they are already unreadable via the app and via RLS the entire time.

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
9. Go to `/waitlist`, submit an email you control, confirm the confirmation email arrives, click the confirm link, and verify you land on the confirmed page with a position number (`#N on the founding list`). This is the first real end-to-end test of the `waitlist_members`/`waitlist_referral_credits` schema created above — confirm it actually works now, not just that the tables exist.

**Risk if skipped:** these are the only remaining checks that can't be verified from source; a real regression here would only surface in production traffic.

---

## Known deferred item (do not re-open without a plan)

**Concurrent proposal accept/decline race** — `lib/room.ts` now rejects an accept/decline if the proposal is no longer `pending` (returns 409), which closes the case where one request completes before a later one arrives. It does **not** close true simultaneous races: two requests that both read the room row as `pending` before either write commits can still both succeed, since `updateProposals` is a full-array read-modify-write with no transaction or optimistic lock. `docs/pressure-test-audit.md` (P1) has the recommended fix: move to a Postgres RPC function that performs the read-check-write inside one transaction. This should land before Stripe/premium (Phase C) — accepting duplicate confirmations is a correctness problem once money is involved, but is low-stakes pre-payment.

Room code entropy (30 bits, 6 chars) was reviewed and accepted for the initial launch scale given per-IP rate limiting on lookups; revisit only if abuse patterns appear or before a large distribution push (per `docs/pressure-test-audit.md`).
