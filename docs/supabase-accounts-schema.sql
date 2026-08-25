-- ClearSlot Phase 2: accounts, groups, and related tables.
-- Run manually in the Supabase SQL editor (isolated/dev project first, then
-- production once verified) — this file is not auto-applied.
--
-- After running this, add the 8 new table names below to the array in
-- docs/supabase-production-rls.sql and re-run that script too, per the
-- existing convention every other table already follows.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_verified boolean not null default false,
  display_name text,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'active', 'grace_period', 'billing_issue')),
  subscription_updated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auth.js's reserved name for "one linked identity provider per user" — not
-- the colloquial product term. Only 'apple' exists today (native + web
-- Sign in with Apple both write here). Never stores the raw Apple token,
-- only the verified sub claim.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_account_id)
);

-- The real-revocation layer, distinct from Auth.js's own sessions table.
-- refresh_token_hash is sha256(raw token) — the raw value is returned to the
-- client once at issuance and never stored. replaced_by_session_id chains
-- rotations; a refresh token presented after its chain successor already
-- exists is a theft signal, revoke the whole chain.
create table if not exists public.account_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  refresh_token_hash text not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  replaced_by_session_id uuid references public.account_sessions(id)
);

create index if not exists idx_account_sessions_user_id on public.account_sessions using btree (user_id);

-- Roster only — deliberately no availability/schedule columns, ever. Every
-- room created from a group still runs the normal ephemeral 48h availability
-- flow from scratch.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_groups_owner_user_id on public.groups using btree (owner_user_id);

-- New PII about people who may never have used ClearSlot or agreed to its
-- privacy policy — contact_value is optional, a group member can be a
-- name-only placeholder the owner recognizes without any contact info at all.
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  display_name text not null,
  contact_type text check (contact_type in ('email', 'phone')),
  contact_value text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_members_group_id on public.group_members using btree (group_id);

-- Supports the opt-in history-claim decision. expires_at is copied from the
-- room's own expires_at at claim time, so this reference never outlives the
-- room's normal 48h window — no new ephemerality exception.
create table if not exists public.account_claimed_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  room_code text not null,
  participant_index integer not null,
  claimed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id, room_code)
);

create index if not exists idx_account_claimed_rooms_expires_at on public.account_claimed_rooms using btree (expires_at);

-- Apple Calendar has no server-side equivalent (device-only via EventKit),
-- so provider is constrained to the two OAuth-based providers. This is
-- meaningfully more sensitive than anything else in this schema — an
-- encrypted refresh token is ongoing third-party calendar access, not a
-- room's ephemeral payload. Encrypt encrypted_refresh_token at the
-- application layer before insert; this column is not itself an encrypted
-- Postgres type.
create table if not exists public.account_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  encrypted_refresh_token bytea not null,
  scope text not null,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- Web-only rolling cache, one row per user, always fully overwritten by the
-- refresh cron, never appended to. busy_blocks holds reduced busy/free only
-- (same shape /api/calendar/busy already produces), never raw event data.
-- expires_at must always be ≤24h from computed_at — enforce this in
-- application code when writing, not here.
create table if not exists public.account_availability_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  busy_blocks jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null,
  expires_at timestamptz not null
);

-- Supports the Recurrence feature. Nullable, small, expires and gets deleted
-- along with the rest of the room exactly as today — no new persistence
-- lifecycle. Verified safe against all 4 existing atomic RPCs (see
-- docs/supabase-rooms-schema.sql) before running this: none of them use a
-- positional insert or reference `rooms` columns in a way a new nullable
-- column could break.
alter table public.rooms add column if not exists recurrence_rule text;
