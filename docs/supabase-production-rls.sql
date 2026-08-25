-- ClearSlot production RLS baseline.
-- Run manually in the production Supabase SQL editor before launch.
-- This file is intentionally stored in the repo as the source of truth, but
-- applying it remains an operational step against the live Supabase project.
--
-- This script is safe to run when older/nonexistent waitlist table names are
-- absent. It only touches tables that actually exist in public.

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'rooms',
    'waitlist',
    'waitlist_members',
    'waitlist_referral_credits',
    'room_notification_targets',
    'users',
    'accounts',
    'account_sessions',
    'groups',
    'group_members',
    'account_claimed_rooms',
    'account_calendar_connections',
    'account_availability_cache'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated', table_name);

      if table_name in ('waitlist', 'waitlist_members') then
        execute format('alter table public.%I drop column if exists signup_ip', table_name);
      end if;

      -- Remove old broad policies first. In particular, public.public_all on
      -- rooms exposes room data to every database role and must not remain.
      for policy_name in
        select p.policyname
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = table_name
          and (
            'public' = any(p.roles)
            or 'anon' = any(p.roles)
            or 'authenticated' = any(p.roles)
            or p.policyname in ('public_all', table_name || '_service_role_only')
          )
      loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;

      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        table_name || '_service_role_only',
        table_name
      );
    end if;
  end loop;
end $$;
