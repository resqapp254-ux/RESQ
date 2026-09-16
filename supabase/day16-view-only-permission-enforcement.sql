-- ============================================================
-- RESQ — Day 16: Enforce view_only responder permission at the
-- database level, not just in the web claim API route.
--
-- Bug: the "responder_permission" column (added in day15) was only
-- checked in admin-dashboard/app/api/emergency/claim/route.js. The
-- mobile app claims/updates emergencies with a *direct* table update
-- (EmergencyDetailScreen.js), which only went through RLS — and the
-- existing RLS policy never looked at responder_permission at all.
-- A view_only responder on mobile could therefore still claim and
-- change the status of an emergency, bypassing the restriction
-- entirely. Fixing this in RLS closes it for every client, present
-- and future, not just the ones that happen to call the API route.
-- ============================================================

create or replace function auth_responder_permission() returns text as $$
  select responder_permission from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public, auth, pg_temp;

drop policy if exists "responders can claim/update within their institution" on emergencies;

create policy "responders can claim/update within their institution"
  on emergencies for update
  using (
    institution_id = auth_institution_id()
    and (
      auth_role() = 'institution_admin'
      or (auth_role() = 'responder' and auth_responder_permission() = 'full')
    )
  );
