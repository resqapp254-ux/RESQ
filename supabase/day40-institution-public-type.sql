-- ============================================================
-- RESQ — Day 40: an explicit "single service" vs "company" choice for
-- public institutions, set at creation instead of only being
-- inferable later from whether partner units exist.
-- NOT YET APPLIED. Review before running against the live project.
-- ============================================================

alter table institutions add column if not exists public_type text
  check (public_type is null or public_type in ('single_service', 'company'));
