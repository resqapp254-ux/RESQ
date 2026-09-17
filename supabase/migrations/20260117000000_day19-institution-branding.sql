-- ============================================================
-- RESQ — Day 19: Institution branding (logo upload + name edit).
--
-- Adds logo_url to institutions, plus a dedicated public storage
-- bucket for logos with its RLS policies defined here in SQL — unlike
-- emergency-photos (configured only via the dashboard, a gap flagged
-- in the last audit), so this one is fully reproducible from the
-- migration files alone.
-- ============================================================

alter table institutions add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('institution-logos', 'institution-logos', true)
on conflict (id) do nothing;

drop policy if exists "public can view institution logos" on storage.objects;
drop policy if exists "super_admin can upload institution logos" on storage.objects;
drop policy if exists "super_admin can update institution logos" on storage.objects;
drop policy if exists "super_admin can delete institution logos" on storage.objects;

create policy "public can view institution logos"
  on storage.objects for select
  using (bucket_id = 'institution-logos');

create policy "super_admin can upload institution logos"
  on storage.objects for insert
  with check (bucket_id = 'institution-logos' and public.auth_role() = 'super_admin');

create policy "super_admin can update institution logos"
  on storage.objects for update
  using (bucket_id = 'institution-logos' and public.auth_role() = 'super_admin');

create policy "super_admin can delete institution logos"
  on storage.objects for delete
  using (bucket_id = 'institution-logos' and public.auth_role() = 'super_admin');
