create table if not exists public.room_notification_targets (
  room_code text not null references public.rooms(code) on delete cascade,
  participant_index integer not null,
  expo_push_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_code, participant_index)
);

alter table public.room_notification_targets enable row level security;

create policy "room_notification_targets_service_role_only"
on public.room_notification_targets
as permissive
for all
to service_role
using (true)
with check (true);

create or replace function public.touch_room_notification_targets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists room_notification_targets_set_updated_at on public.room_notification_targets;

create trigger room_notification_targets_set_updated_at
before update on public.room_notification_targets
for each row
execute function public.touch_room_notification_targets_updated_at();
