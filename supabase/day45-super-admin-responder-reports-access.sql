-- Day 45 — super_admin had no RLS access to responder_reports at all.
--
-- Every existing policy on this table checks either
-- reported_by = auth.uid() (the reporter themselves) or
-- auth_role() = 'institution_admin' scoped to their own institution.
-- Nothing granted super_admin visibility, so even after adding a
-- super-admin UI to view these, the query would return zero rows.
-- Mirrors the same "super_admin full access" pattern already used on
-- institutions and profiles.

create policy "super_admin full access on responder_reports"
  on responder_reports for all
  using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');
