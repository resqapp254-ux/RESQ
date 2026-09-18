-- ============================================================
-- RESQ — Day 32: Add 'unit_admin' as a user_role.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Split into its own migration on purpose, same reason as day24:
-- Postgres refuses to use a brand-new enum value in the same
-- transaction that added it. The actual unit_admin feature (columns,
-- RLS, onboarding) lives in day33, run as a separate script after
-- this one has committed.
--
-- A unit_admin is a partner unit's (institution_services row) own
-- login: they set up their own unit's location/coordinates/contact
-- details and manage the responders linked to their own unit, the
-- same way an institution_admin manages their whole institution, just
-- scoped to one unit instead of the whole institution.
-- ============================================================

alter type user_role add value if not exists 'unit_admin';
