-- ============================================================
-- RESQ — Day 24: Add 'individual' as a service_type.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Split into its own migration on purpose: Postgres refuses to use a
-- brand-new enum value in the same transaction that added it
-- ("unsafe use of new value"), so the nullable-columns/constraint
-- change that actually USES 'individual' lives in day25 instead, run
-- as a separate script after this one has committed.
-- ============================================================

alter type service_type add value if not exists 'individual';
