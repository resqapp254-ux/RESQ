-- ============================================================
-- RESQ — Day 6: Allow users to update their own emergency
-- (needed for live location pings while an emergency is active)
-- Run this in Supabase SQL Editor after previous scripts.
-- ============================================================

drop policy if exists "users can update their own active emergency" on emergencies;

create policy "users can update their own active emergency"
  on emergencies for update
  using (triggered_by = auth.uid())
  with check (triggered_by = auth.uid());
