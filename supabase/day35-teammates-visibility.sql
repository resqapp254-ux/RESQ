-- ============================================================
-- RESQ — Day 35: Let responders see their own institution's other
-- staff (name, phone, etc), not just admins.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Real gap found while wiring "secondary responder can see and call
-- the primary responder handling/who should handle an emergency":
-- no RLS policy ever let a plain `responder` SELECT another
-- responder's/admin's profile row. Every "Claimed by <name>" or
-- team-chat sender-name join for a plain responder viewer has
-- therefore been silently returning null this whole time (PostgREST
-- returns null for an embedded resource RLS blocks, not an error),
-- not just the new phone-number display this migration is meant to
-- support. institution_admin/unit_admin already had this access via
-- their own "manages own institution's staff"/"manages own unit
-- responders" policies; this closes the same gap for plain
-- responders looking at their own teammates.
-- ============================================================

drop policy if exists "responders view teammates in their own institution" on profiles;
create policy "responders view teammates in their own institution"
  on profiles for select
  using (
    auth_role() = 'responder'
    and institution_id = auth_institution_id()
    and role in ('responder', 'institution_admin', 'unit_admin')
  );
