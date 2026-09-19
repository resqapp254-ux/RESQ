-- Day 44 — a public-mode user could not see basic info (name, logo,
-- location, contact number) about the institution their own emergency
-- was routed to.
--
-- institutions only had two SELECT policies: institution staff
-- viewing their own institution, and users viewing institutions
-- they've explicitly joined via user_institutions (which
-- join_institution_by_code populates). A public-mode account never
-- calls that RPC — routing picks the nearest institution per trigger
-- — so there was no user_institutions row and no other policy let
-- them read that institution's row at all. The web/mobile trigger
-- response already returns this once via supabaseAdmin (bypassing
-- RLS), but refreshing the page or waiting for the realtime loop to
-- re-fetch — which day43 fixed for the emergency itself — had no way
-- to bring the routed institution's info back.
--
-- Safe to add: only ever exposes an institution a user's OWN
-- (triggered_by = auth.uid()) emergency actually points to — never
-- an arbitrary institution.

create policy "users can view institutions their emergency was routed to"
  on institutions for select
  using (
    id in (select institution_id from emergencies where triggered_by = auth.uid())
  );
