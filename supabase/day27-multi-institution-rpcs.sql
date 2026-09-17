-- ============================================================
-- RESQ — Day 27: RPC changes for public/private accounts and
-- multi-institution membership (see day26 for the schema).
-- NOT YET APPLIED. Review before running against the live project.
-- ============================================================

-- ------------------------------------------------------------
-- 1. join_institution_by_code — unchanged signature, now also
-- remembers the institution in user_institutions so the user can
-- switch back to it later without re-entering the code, and always
-- forces account_mode back to 'private' (entering a code is an
-- explicit private-institution action even if they were in public
-- mode before).
-- ------------------------------------------------------------
create or replace function join_institution_by_code(code text)
returns json as $$
declare
  inst institutions%rowtype;
  prof profiles%rowtype;
begin
  select * into prof from profiles where id = auth.uid();

  if prof.role != 'user' then
    return json_build_object('success', false, 'error', 'Only users join via institution code');
  end if;

  select * into inst from institutions where institution_code = code;

  if inst.id is null then
    return json_build_object('success', false, 'error', 'Invalid institution code');
  end if;

  if inst.status != 'active' then
    return json_build_object('success', false, 'error', 'This institution is not yet active');
  end if;

  insert into user_institutions (user_id, institution_id)
    values (auth.uid(), inst.id)
    on conflict (user_id, institution_id) do nothing;

  update profiles
    set institution_id = inst.id, entered_institution_code = code, account_mode = 'private'
    where id = auth.uid();

  return json_build_object('success', true, 'institution_name', inst.name);
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

-- ------------------------------------------------------------
-- 2. set_account_mode — the public/private toggle. Switching to
-- 'public' doesn't clear institution_id (so switching back to
-- 'private' returns to the same institution without re-entering a
-- code); it's simply ignored for routing while in public mode.
-- ------------------------------------------------------------
create or replace function set_account_mode(mode text)
returns json as $$
declare
  prof profiles%rowtype;
begin
  if mode not in ('public', 'private') then
    return json_build_object('success', false, 'error', 'Invalid mode');
  end if;

  select * into prof from profiles where id = auth.uid();
  if prof.role != 'user' then
    return json_build_object('success', false, 'error', 'Only users have an account mode');
  end if;

  if mode = 'private' and prof.institution_id is null then
    return json_build_object('success', false, 'error', 'Enter an institution code before switching to private mode');
  end if;

  update profiles set account_mode = mode where id = auth.uid();
  return json_build_object('success', true, 'account_mode', mode);
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

-- ------------------------------------------------------------
-- 3. switch_active_institution — flip which already-joined
-- institution is active, with no code re-entry. Also forces
-- account_mode back to 'private', since picking a specific
-- institution is a private-mode action.
-- ------------------------------------------------------------
create or replace function switch_active_institution(target_institution_id uuid)
returns json as $$
declare
  prof profiles%rowtype;
  inst institutions%rowtype;
  is_member boolean;
begin
  select * into prof from profiles where id = auth.uid();
  if prof.role != 'user' then
    return json_build_object('success', false, 'error', 'Only users switch institutions');
  end if;

  select exists(
    select 1 from user_institutions where user_id = auth.uid() and institution_id = target_institution_id
  ) into is_member;

  if not is_member then
    return json_build_object('success', false, 'error', 'You are not linked to that institution');
  end if;

  select * into inst from institutions where id = target_institution_id;

  update profiles set institution_id = target_institution_id, account_mode = 'private' where id = auth.uid();
  return json_build_object('success', true, 'institution_name', inst.name);
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

-- ------------------------------------------------------------
-- 4. get_onboarding_status — a 'public' account_mode skips the
-- institution-code requirement entirely; also now returns
-- account_mode so the client can render the toggle in its current
-- state without a second query.
-- ------------------------------------------------------------
create or replace function get_onboarding_status()
returns json as $$
declare
  prof profiles%rowtype;
  inst institutions%rowtype;
begin
  select * into prof from profiles where id = auth.uid();

  if prof.role = 'super_admin' then
    return json_build_object('role', 'super_admin', 'next_step', 'dashboard');
  end if;

  if prof.role = 'institution_admin' then
    select * into inst from institutions where id = prof.institution_id;
    if inst.status != 'active' then
      return json_build_object('role', 'institution_admin', 'next_step', 'enter_verification_code');
    end if;
    return json_build_object('role', 'institution_admin', 'next_step', 'dashboard');
  end if;

  if prof.role = 'responder' then
    return json_build_object('role', 'responder', 'next_step', 'app');
  end if;

  if prof.role = 'user' then
    if prof.account_mode = 'public' then
      return json_build_object('role', 'user', 'next_step', 'app', 'account_mode', 'public');
    end if;
    if prof.institution_id is null then
      return json_build_object('role', 'user', 'next_step', 'enter_institution_code', 'account_mode', 'private');
    end if;
    return json_build_object('role', 'user', 'next_step', 'app', 'account_mode', 'private');
  end if;

  return json_build_object('role', null, 'next_step', 'unknown');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;
