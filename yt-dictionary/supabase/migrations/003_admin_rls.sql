-- ============================================================
-- YT Dictionary – Migration 003: Admin Panel & Profile Security
-- Run this in your Supabase project: SQL Editor > New Query
-- ============================================================

-- ── 1. Prevent non-admins from escalating their own role ─────
-- The existing "profiles_update_own" policy has no column-level
-- restriction, so a user with direct API access could set their
-- own role to 'admin'. This trigger blocks any role change that
-- isn't made by an admin.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer as $$
begin
  if old.role != new.role and
     (select role from public.profiles where id = auth.uid()) != 'admin'
  then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

-- Only fires when the 'role' column is actually being changed.
create trigger on_profile_role_change
  before update of role on public.profiles
  for each row execute procedure public.prevent_role_escalation();

-- ── 2. Allow admins to update any user's profile ─────────────
-- The existing "profiles_update_own" policy only allows users to
-- update their own row. Admins need to update *any* user's role
-- for the admin panel to work.
create policy "profiles_update_admin" on public.profiles
  for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
