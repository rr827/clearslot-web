# Supabase RLS Release Gate

This audit must be completed against the production Supabase project before a public launch.

## Scope

- `rooms`
- `waitlist`

## Required checks

- Row Level Security is enabled on each table.
- The `anon` role has no unintended `select`, `insert`, `update`, or `delete` access.
- The app continues to use the service-role key only on the server.
- No client bundle, mobile build, or public environment variable exposes a write-capable Supabase credential.

## SQL applied (run in Supabase dashboard, 2026-07-12)

```sql
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE rooms FROM anon, authenticated;
REVOKE ALL ON TABLE waitlist FROM anon, authenticated;
```

Service role bypasses RLS by design — all server-side application calls are unaffected.

## Record of review (2026-07-12)

| Table | RLS enabled | Active policies reviewed | `anon` read access | `anon` write access | Result |
| --- | --- | --- | --- | --- | --- |
| `rooms` | ✓ | None (REVOKE denies all) | None | None | Pass |
| `waitlist` | ✓ | None (REVOKE denies all) | None | None | Pass |

## Release decision

- [x] Production RLS audit completed
- [x] No unsafe `anon` access remains
- [x] Service-role usage remains server-only
- [x] Release approved
