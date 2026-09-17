-- ============================================================
-- RESQ — Day 29: Optional admission/work-ID numbers and a one-time
-- responder profile picture, both switched on per-institution.
-- NOT YET APPLIED. Review before running against the live project.
--
-- An institution admin can require an admission number (student ID,
-- staff/work ID, membership ref, whatever fits the institution) from
-- users and/or responders, collected once on first login and shown
-- from then on whenever they trigger or respond to an emergency. A
-- responder photo, if required, is likewise collected once.
-- ============================================================

alter table institutions add column if not exists require_admission_number boolean not null default false;
alter table institutions add column if not exists require_responder_photo boolean not null default false;

alter table profiles add column if not exists admission_number text;
alter table profiles add column if not exists avatar_url text;

-- ------------------------------------------------------------
-- avatars storage bucket — public read (so a responder's photo shows
-- up in the emergency/claim UI without a signed URL), writable only
-- by the profile owner, matching the pattern used for
-- institution-logos and emergency-photos.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "public can view avatars" on storage.objects;
drop policy if exists "users can upload their own avatar" on storage.objects;
drop policy if exists "users can update their own avatar" on storage.objects;

create policy "public can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');
