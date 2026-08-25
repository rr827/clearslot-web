-- ClearSlot `rooms` table + its 4 atomic mutation RPCs.
-- Pulled directly from production Supabase (2026-08-24) and committed here for
-- the first time — this table and its RPCs were previously applied live via
-- MCP during an incident and never captured into version control (see
-- LAUNCH_RUNBOOK.md). This file is documentation of what already exists in
-- production, not a script meant to be (re-)run against it.

create table if not exists public.rooms (
  code text not null,
  expires_at timestamptz not null,
  participants jsonb not null default '[]'::jsonb,
  proposals jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  constraint rooms_pkey primary key (code)
);

create index if not exists idx_rooms_expires_at on public.rooms using btree (expires_at);

-- Adds a new participant's encoded payload to the room, capped at
-- p_max_participants. Concurrency-safe: the length check happens inside the
-- same UPDATE as the write, so two simultaneous joins can't both succeed past
-- the cap.
create or replace function public.join_room_atomic(p_code text, p_payload text, p_max_participants integer default 10)
 returns rooms
 language plpgsql
 security definer
as $function$
declare
  v_room rooms;
begin
  update rooms
  set participants = participants || jsonb_build_array(p_payload)
  where code = p_code
    and jsonb_array_length(participants) < p_max_participants
  returning * into v_room;

  if v_room.code is null then
    if not exists (select 1 from rooms where code = p_code) then
      raise exception 'Room not found' using errcode = 'P0002';
    else
      raise exception 'Room is full' using errcode = 'P0001';
    end if;
  end if;

  return v_room;
end;
$function$;

-- Overwrites one participant's payload in place by array index (used for
-- both normal availability updates and the delete-my-data flow, which writes
-- a server-defined empty payload through this same function).
create or replace function public.update_participant_payload_atomic(p_code text, p_participant_index integer, p_payload text)
 returns rooms
 language plpgsql
 security definer
as $function$
declare
  v_room rooms;
begin
  update rooms
  set participants = jsonb_set(participants, array[p_participant_index::text], to_jsonb(p_payload))
  where code = p_code
    and p_participant_index >= 0
    and p_participant_index < jsonb_array_length(participants)
  returning * into v_room;

  if v_room.code is null then
    if not exists (select 1 from rooms where code = p_code) then
      raise exception 'Room not found' using errcode = 'P0002';
    else
      raise exception 'Invalid participant' using errcode = 'P0001';
    end if;
  end if;

  return v_room;
end;
$function$;

-- Appends a new proposed time slot, capped at 50 proposals per room and
-- rejecting an exact-duplicate pending proposal (same start/end already
-- proposed and not yet resolved).
create or replace function public.append_proposal_atomic(p_code text, p_proposer_index integer, p_start_time text, p_end_time text)
 returns rooms
 language plpgsql
 security definer
as $function$
declare
  v_room rooms;
  v_proposal jsonb;
begin
  select * into v_room from rooms where code = p_code;
  if v_room.code is null then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if p_proposer_index < 0 or p_proposer_index >= jsonb_array_length(v_room.participants) then
    raise exception 'Invalid participant' using errcode = 'P0001';
  end if;

  v_proposal := jsonb_build_object(
    'proposer_index', p_proposer_index,
    'start_time', p_start_time,
    'end_time', p_end_time,
    'status', 'pending'
  );

  update rooms
  set proposals = proposals || jsonb_build_array(v_proposal)
  where code = p_code
    and jsonb_array_length(proposals) < 50
    and not exists (
      select 1 from jsonb_array_elements(proposals) p
      where p->>'start_time' = p_start_time
        and p->>'end_time' = p_end_time
        and p->>'status' = 'pending'
    )
  returning * into v_room;

  if v_room.code is null then
    raise exception 'Too many proposals, or this time has already been proposed' using errcode = 'P0001';
  end if;

  return v_room;
end;
$function$;

-- Accepts or declines a specific proposal by index, only if it's still
-- pending (prevents a race where two participants resolve the same proposal
-- at once).
create or replace function public.set_proposal_status_atomic(p_code text, p_proposal_index integer, p_new_status text)
 returns rooms
 language plpgsql
 security definer
as $function$
declare
  v_room rooms;
begin
  if p_new_status not in ('accepted', 'declined') then
    raise exception 'Invalid status' using errcode = 'P0001';
  end if;

  select * into v_room from rooms where code = p_code;
  if v_room.code is null then
    raise exception 'Room not found' using errcode = 'P0002';
  end if;

  if p_proposal_index < 0 or p_proposal_index >= jsonb_array_length(v_room.proposals) then
    raise exception 'Invalid proposal' using errcode = 'P0001';
  end if;

  update rooms
  set proposals = jsonb_set(proposals, array[p_proposal_index::text, 'status'], to_jsonb(p_new_status))
  where code = p_code
    and proposals->p_proposal_index->>'status' = 'pending'
  returning * into v_room;

  if v_room.code is null then
    raise exception 'Proposal is no longer pending' using errcode = 'P0001';
  end if;

  return v_room;
end;
$function$;
