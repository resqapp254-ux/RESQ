-- ============================================================
-- RESQ — Day 15: fix institution-join bug, institution-level
-- emergency controls, responder permissions, media fields, and
-- institution-wide responder chat.
-- Run in the Supabase SQL Editor after day14.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CRITICAL FIX: protect_profile_security_fields (day12) silently
-- reverted profiles.institution_id on EVERY update from a non-
-- super_admin caller — including join_institution_by_code() itself,
-- which runs as the calling user. A user entering their institution
-- code got {success:true} back, but institution_id was wiped back to
-- null by this trigger, so the app looped back to "enter code"
-- forever. This narrowly allows the one legitimate self-service
-- transition (a `user`, currently unlinked, linking for the first
-- time) while still blocking every other case exactly as before.
-- ------------------------------------------------------------
create or replace function protect_profile_security_fields()
returns trigger as $$
begin
  if auth_role() <> 'super_admin' then
    new.role := old.role;
    new.email := old.email;
    if not (old.role = 'user' and new.role = 'user' and old.institution_id is null) then
      new.institution_id := old.institution_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

-- ------------------------------------------------------------
-- 2. INSTITUTION-CONFIGURABLE EMERGENCY TYPES
-- Which emergency types a user reporting to this institution is
-- offered. Defaults to everything (including the new
-- property_damage type) so nothing disappears for existing
-- institutions until an admin deliberately narrows it.
-- ------------------------------------------------------------
alter table institutions add column if not exists enabled_emergency_types text[]
  not null default array['medical','fire','accident','security','gbv','mental_health','property_damage','other'];

-- ------------------------------------------------------------
-- 3. PER-RESPONDER PERMISSIONS
-- responder_emergency_types: which emergency types this responder
--   is notified of / sees in their queue. Null or empty = all types
--   (today's behavior, unchanged for anyone not explicitly narrowed).
-- responder_permission: 'full' (can claim/respond/resolve, today's
--   only behavior) or 'view_only' (sees the log, cannot claim).
-- ------------------------------------------------------------
alter table profiles add column if not exists responder_emergency_types text[];
alter table profiles add column if not exists responder_permission text not null default 'full';
alter table profiles add constraint responder_permission_check check (responder_permission in ('full', 'view_only'));

-- ------------------------------------------------------------
-- 4. MEDIA ON AN EMERGENCY — video and voice note, alongside the
-- existing photo_url, so a report can carry any combination.
-- ------------------------------------------------------------
alter table emergencies add column if not exists video_url text;
alter table emergencies add column if not exists voice_note_url text;

-- ------------------------------------------------------------
-- 5. INSTITUTION-WIDE RESPONDER CHAT
-- Separate from per-emergency chat with the reporting user — this
-- is responders (and their institution_admin) coordinating with
-- each other, e.g. asking for backup on a case.
-- ------------------------------------------------------------
create table institution_chat_messages (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  message text not null,
  created_at timestamptz default now()
);

create index idx_institution_chat_institution on institution_chat_messages(institution_id, created_at);

alter table institution_chat_messages enable row level security;

create policy "institution staff can read their institution's chat"
  on institution_chat_messages for select
  using (institution_id = auth_institution_id() and auth_role() in ('responder', 'institution_admin'));

create policy "institution staff can post to their institution's chat"
  on institution_chat_messages for insert
  with check (
    sender_id = auth.uid()
    and institution_id = auth_institution_id()
    and auth_role() in ('responder', 'institution_admin')
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'institution_chat_messages'
  ) then
    alter publication supabase_realtime add table institution_chat_messages;
  end if;
end $$;
