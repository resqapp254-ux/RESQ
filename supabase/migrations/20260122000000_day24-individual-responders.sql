-- ============================================================
-- RESQ — Day 24: Individual responders (a person, not an
-- institution/unit) who receive matching emergencies regardless of
-- location, since they have no fixed physical location to route by.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Lets an institution admin register a partner unit as a single
-- individual (e.g. a specific on-call officer or volunteer) rather
-- than a hospital/police post/etc with a physical address. An
-- institution can consist entirely of individual responders with no
-- location pins at all if that's all it needs.
-- ============================================================

alter type service_type add value if not exists 'individual';

alter table institution_services alter column lat drop not null;
alter table institution_services alter column lng drop not null;

alter table institution_services drop constraint if exists institution_services_location_required;
alter table institution_services add constraint institution_services_location_required
  check (service_type = 'individual' or (lat is not null and lng is not null));
