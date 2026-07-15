# ClearSlot Pressure-Test Audit

Last reviewed: 2026-07-12

## Executive summary

The main public room routes now have basic abuse protection: create, join, room fetch, update, propose, accept, decline, calendar fetch, and waitlist submission all have rate limits. Join abuse also has failed-attempt tracking, cooldown escalation, and optional Turnstile enforcement.

This pass tightened the most obvious gaps found during static review:

- Malformed JSON and non-string room payloads are rejected before room mutation work.
- Join attempts with invalid payloads, oversized payloads, invalid room codes, missing rooms, or full rooms are counted as failed joins.
- Proposal, accept, and decline rate-limit keys no longer include raw room session tokens.
- Proposal timestamps must parse as real dates and end after they start.
- Notification target registration now has IP-level and participant-level throttling.

The biggest remaining pressure risk is not request rate limiting. It is concurrent write behavior: room participants and proposals are stored as arrays and updated with read-modify-write replacement. Under simultaneous joins, updates, or proposals, one write can overwrite another unless the database write becomes transactional or version-checked.

## What looks solid now

### Room route throttling

- `POST /api/room/create` is limited by IP before room creation.
- `POST /api/room/join` is limited by IP, tracks failed attempts, escalates to optional Turnstile after repeated failures, and applies cooldowns.
- `GET /api/room/[code]` is limited by IP and only returns full room data to a verified room session.
- `POST /api/room/propose` is limited by room code plus verified participant index.
- `POST /api/room/accept` and `POST /api/room/decline` are limited by room code plus verified participant index.
- `POST /api/room/update` has a broad IP limit and a verified participant limit.
- `POST /api/room/notifications/register` now has a broad IP limit and a verified participant limit.

### Session and room access

- Room mutation endpoints verify the HMAC room session before changing room state.
- Anonymous room fetches return only code, expiry, participant count, and joinability.
- Room session cookies are `httpOnly`, `sameSite: lax`, path-scoped to `/`, and secure in production.

### Header posture

- Middleware sets a nonce-based CSP, clickjacking protection, nosniff, referrer policy, permissions policy, and production HSTS.
- Production `script-src` does not include `unsafe-eval`; development keeps it only for local tooling.

## Remaining high-priority gaps

### P1: Concurrent room writes can lose updates

Location: `lib/storage/supabase-room-store.ts`

Evidence:

- `updateParticipants()` replaces the whole `participants` array.
- `updateProposals()` replaces the whole `proposals` array.

Impact:

If two users join at the same time, or if two participants propose/accept/decline close together, each request can read the same old row and then write back a different full array. The later write wins, which can drop the earlier participant/proposal/status change. Rate limiting reduces spam but does not solve this race.

Recommended fix:

- Add database-side RPC functions for `join_room`, `update_participant_payload`, and `append_or_update_proposal`.
- Run the read/check/write in one Postgres transaction.
- Return the new participant index from the transaction.
- Add a `version` or `updated_at` precondition if keeping row-level updates.

Launch stance:

This should be fixed before heavy public usage. It is the most important durability issue left.

### P1: Room code entropy remains modest for public launch

Location: `lib/room.ts`

Evidence:

- Room codes are six characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.

Impact:

The code space is roughly 30^6, which is fine for private beta with join throttling, but it is still a finite brute-force target if the product gets broad traffic. Join abuse controls make this less urgent, but longer codes reduce the baseline risk.

Recommended fix:

- Move to 8 characters before a public marketing push.
- Keep the existing 6-character route compatible for existing rooms until they expire.

Launch stance:

Not a blocker for small launch if join throttling and Turnstile are live. Do before large distribution.

### P2: `.ics` parsing is heavier than the original minimum hardening target

Location: `app/connect/ConnectIcsSection.tsx`

Evidence:

- File cap is 1 MB.
- Block cap is 10,000.
- Parse timeout is 5 seconds.
- RRULE/RDATE/EXDATE expansion is supported in-browser.

Impact:

This is more user-friendly than rejecting recurring files, but it increases CPU work in the browser. A crafted recurring file could still cause a bad local experience, even if it does not hit the server.

Recommended fix:

- Lower `MAX_ICS_BLOCKS` to 5,000.
- Lower `ICS_PARSE_TIMEOUT_MS` to 1,500-2,000 ms.
- Keep recurrence support only if product wants it now; otherwise reject recurrence-bearing files clearly.

Launch stance:

Not a server-cost risk, but worth tightening before broader traffic.

### P2: Calendar proxy is IP-limited only

Location: `app/api/calendar/busy/route.ts`

Evidence:

- `calendar_busy:${ip}` allows 10 requests per minute.

Impact:

This protects Google/Microsoft fetch cost, but users behind the same NAT can throttle each other. Conversely, distributed abuse can still spread across IPs. Because the endpoint uses auth cookies/bearer tokens, adding a token-fingerprint or account-scoped dimension would make this more precise.

Recommended fix:

- Keep the IP limit.
- Add a second limiter keyed by a non-reversible hash of the access token or provider session.

Launch stance:

Good enough for now, but refine before team/organization usage.

### P2: Failed room fetches are not escalated like failed joins

Location: `app/api/room/[code]/route.ts`

Evidence:

- Room fetch is limited to 30 per minute per IP.
- Not-found room fetches do not feed the failed-join cooldown/Turnstile ladder.

Impact:

An attacker can enumerate room-code existence through the metadata endpoint at a slower rate. The response does not expose payloads, but it can confirm whether a room exists.

Recommended fix:

- Track repeated `404` room metadata fetches in the same failed-room counter family.
- Consider returning a generic join landing state for invalid room codes after repeated failures.

Launch stance:

Medium risk. Join throttling covers the mutation path; metadata probing is the remaining reconnaissance path.

## Load test plan

Use these scenarios before calling the product heavy-usage ready:

- Create burst: 50-100 room-create attempts from one IP; expect `429` after 10/min and no room DB spike.
- Join failure ladder: 12 invalid joins from one IP; expect normal errors first, optional challenge after 5 if Turnstile is configured, 30-second cooldown after 8, 10-minute cooldown after 12.
- Valid join burst: 10 simultaneous joins into one room; expect no duplicate or missing participants. This will likely expose the concurrent write issue until fixed.
- Proposal burst: 20 proposals by one participant; expect `429` after 12/min and proposal cap at 50 per room.
- Accept/decline burst: repeated accept/decline by one participant; expect `429` after 30/min.
- Calendar fetch burst: 20 `/api/calendar/busy` calls; expect `429` after 10/min.
- `.ics` stress: 1 MB file with many VEVENTs and recurrence rules; expect parse failure before UI freeze.

## Production checks outside code

- Confirm Upstash Redis env vars are configured in production. Without them, the fallback limiter is per-function-instance and not strong enough for multi-instance production abuse.
- Confirm Turnstile site and secret keys are configured if you want challenge enforcement rather than cooldown-only behavior.
- Confirm Supabase RLS remains enabled on `rooms`, `waitlist_members`, and `room_notification_targets`, with no `anon` policies that expose row data.
- Confirm Vercel function logs do not include request bodies containing room payloads.
- Vercel Hobby only supports daily cron jobs. Keep `vercel.json` daily on Hobby, or move cleanup to Vercel Pro/external cron before using hourly cleanup.
