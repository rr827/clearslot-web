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

## Record of review

| Table | RLS enabled | Active policies reviewed | `anon` read access | `anon` write access | Result |
| --- | --- | --- | --- | --- | --- |
| `rooms` |  |  |  |  |  |
| `waitlist` |  |  |  |  |  |

## Release decision

- [ ] Production RLS audit completed
- [ ] No unsafe `anon` access remains
- [ ] Service-role usage remains server-only
- [ ] Release approved
