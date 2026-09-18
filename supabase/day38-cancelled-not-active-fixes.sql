-- ============================================================
-- RESQ — Day 38: cancelled emergencies were still counted as
-- "active" in several places.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Bug: get_institution_emergency_summary() (day14) counts
-- active_count as `status <> 'resolved'` — a cancelled emergency
-- passes that filter too, so a cancelled case kept showing up as
-- "active" in the super-admin institutions table and its "LIVE"
-- badge, even though nothing about it needs a response anymore.
-- Same bug existed client-side in a couple of places (fixed in the
-- app code alongside this migration): the plain reporting user's own
-- "do I have an active emergency" query, and super-admin's global
-- active-emergency counter, both used `.neq('status', 'resolved')`
-- instead of explicitly listing the actually-active statuses.
-- ============================================================

create or replace function get_institution_emergency_summary()
returns table(institution_id uuid, active_count bigint, resolved_count bigint) as $$
begin
  if auth_role() <> 'super_admin' then
    raise exception 'Not authorized';
  end if;
  return query
    select e.institution_id,
           count(*) filter (where e.status in ('triggered', 'claimed', 'in_progress')) as active_count,
           count(*) filter (where e.status = 'resolved') as resolved_count
    from emergencies e
    group by e.institution_id;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;
