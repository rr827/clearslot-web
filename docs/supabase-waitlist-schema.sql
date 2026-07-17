-- ClearSlot waitlist schema — creates the tables and RPC the application
-- code already expects (app/api/waitlist/*, lib/waitlist.ts) but that were
-- never created in the production Supabase project. The `waitlist` table
-- that already exists is an older, unrelated 3-column stub (id, email,
-- joined_at) with 0 rows in production — safe to leave in place or drop
-- separately; this script does not touch it.
--
-- After running this script, re-run docs/supabase-production-rls.sql — it
-- already loops over `waitlist_members` and `waitlist_referral_credits` and
-- will enable RLS + lock both down to service_role only once they exist.

create sequence if not exists public.waitlist_position_seq;

create table if not exists public.waitlist_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  referral_code text not null unique,
  referred_by uuid references public.waitlist_members(id),
  status text not null default 'pending',
  confirmed_at timestamptz,
  confirm_token text,
  position integer not null default nextval('public.waitlist_position_seq'),
  intent_answer integer,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist_referral_credits (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references public.waitlist_members(id),
  referred_id uuid not null references public.waitlist_members(id),
  excluded boolean not null default false,
  exclusion_reason text,
  created_at timestamptz not null default now()
);

create or replace function public.decrement_waitlist_position(member_id uuid, amount int)
returns void
language plpgsql
as $$
begin
  update public.waitlist_members
  set position = greatest(1, position - amount)
  where id = member_id;
end;
$$;
