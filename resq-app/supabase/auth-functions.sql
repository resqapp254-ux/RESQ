-- ============================================================
-- RESQ — Day 2: Auth flow functions
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. AUTO-CREATE PROFILE ON SIGNUP
-- Whenever someone signs up via Supabase Auth, this trigger
-- creates their matching row in `profiles`. Role/institution
-- come from metadata passed at signUp() time (see admin API
-- and mobile signup code below).
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, institution_id, full_name, phone, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'user'),
    nullif(new.raw_user_meta_data->>'institution_id', '')::uuid,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- 2. INSTITUTION ADMIN — redeem verification code
-- Called once, on first login, by an institution_admin whose
-- account was already created (with institution_id set) by
-- the super_admin. This activates the institution.
-- ------------------------------------------------------------
create or replace function redeem_verification_code(code text)
returns json as $$
declare
  prof profiles%rowtype;
  inst institutions%rowtype;
begin
  select * into prof from profiles where id = auth.uid();

  if prof.role is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;

  if prof.role != 'institution_admin' then
    return json_build_object('success', false, 'error', 'Only institution admins can redeem a verification code');
  end if;

  select * into inst from institutions where id = prof.institution_id;

  if inst.id is null then
    return json_build_object('success', false, 'error', 'No institution linked to this account');
  end if;

  if inst.verification_code_used then
    return json_build_object('success', false, 'error', 'This institution is already verified');
  end if;

  if inst.verification_code != code then
    return json_build_object('success', false, 'error', 'Incorrect verification code');
  end if;

  update institutions
    set status = 'active', verification_code_used = true, updated_at = now()
    where id = inst.id;

  return json_build_object('success', true, 'institution_name', inst.name);
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 3. USERS — join institution by code
-- Called once, on first login, by a self-signed-up `user`.
-- Routes their future emergencies to the matching institution.
-- Institution must be 'active' (i.e. already verified by its admin).
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

  update profiles
    set institution_id = inst.id, entered_institution_code = code
    where id = auth.uid();

  return json_build_object('success', true, 'institution_name', inst.name);
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 4. Helper the frontend calls right after login to know
-- which screen to show next (verification, code entry, or
-- straight to the dashboard/app).
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
    if prof.institution_id is null then
      return json_build_object('role', 'user', 'next_step', 'enter_institution_code');
    end if;
    return json_build_object('role', 'user', 'next_step', 'app');
  end if;

  return json_build_object('role', null, 'next_step', 'unknown');
end;
$$ language plpgsql security definer;
