-- Day 43 — fix: a public-mode user could not see their own emergency.
--
-- "institution isolation on emergencies" only allowed SELECT where
-- institution_id = auth_institution_id() (the caller's OWN
-- profiles.institution_id) or super_admin. A public-mode account has
-- no fixed institution_id (that's the point of "public" — routing
-- picks whichever institution is nearest at trigger time), so once
-- their emergency was created with institution_id = <routed
-- institution>, this policy could never match: their own
-- profiles.institution_id is null/unrelated, so it's never equal to
-- the emergency's institution_id.
--
-- Practical effect: after the initial trigger response (which comes
-- from the API route's supabaseAdmin call and bypasses RLS), a public
-- user's own client-side queries and Realtime subscription for that
-- same emergency returned nothing — no status updates, no claim
-- notice, no AI advice refresh. The chat table already had the
-- correct carve-out ("chat visible to institution + the triggering
-- user", emergency_messages) — this brings the emergencies table's
-- own policy in line with that existing, correct pattern.
--
-- Safe to add: triggered_by = auth.uid() only ever matches rows the
-- caller themselves created (auth.uid() can't be spoofed), so this
-- adds zero cross-tenant visibility — it only ever grants a user
-- visibility into their own emergency, mirroring the INSERT and
-- UPDATE policies on this same table, which already use exactly this
-- condition.

drop policy if exists "institution isolation on emergencies" on emergencies;

create policy "institution isolation on emergencies"
  on emergencies for select
  using (
    institution_id = auth_institution_id()
    or auth_role() = 'super_admin'
    or triggered_by = auth.uid()
  );
