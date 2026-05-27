-- ============================================================
-- YT Dictionary – Initial Schema
-- Run this in your Supabase project: SQL Editor > New Query
-- ============================================================

-- ── 1. Profiles ─────────────────────────────────────────────
-- Mirrors auth.users and stores the user's role.
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text unique not null,
  role        text not null default 'reader'
                check (role in ('admin', 'reader', 'approver')),
  created_at  timestamptz default now()
);

-- Auto-create a profile row whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. Words ────────────────────────────────────────────────
create table public.words (
  id            uuid primary key default gen_random_uuid(),
  term          text unique not null,
  definition    text not null,
  example       text,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  submitted_by  uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz default now()
);

-- ── 3. Votes ────────────────────────────────────────────────
create table public.votes (
  id          uuid primary key default gen_random_uuid(),
  word_id     uuid not null references public.words(id) on delete cascade,
  voter_id    uuid not null references public.profiles(id) on delete cascade,
  decision    text not null check (decision in ('approve', 'reject')),
  created_at  timestamptz default now(),
  unique (word_id, voter_id)   -- one vote per approver per word
);

-- ── 4. Voting trigger ────────────────────────────────────────
-- After any vote is cast, recalculate the word status.
-- A word is approved when approve votes exceed 50% of all approvers.
create or replace function public.handle_vote_cast()
returns trigger language plpgsql security definer as $$
declare
  v_approver_count  int;
  v_approve_votes   int;
begin
  select count(*) into v_approver_count
  from public.profiles where role in ('approver', 'admin');

  select count(*) into v_approve_votes
  from public.votes
  where word_id = new.word_id and decision = 'approve';

  if v_approver_count > 0 and v_approve_votes > (v_approver_count / 2.0) then
    update public.words
    set status = 'approved', reviewed_at = now()
    where id = new.word_id;
  end if;

  return new;
end;
$$;

create trigger on_vote_cast
  after insert or update on public.votes
  for each row execute procedure public.handle_vote_cast();

-- ── 5. Row-Level Security ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.words     enable row level security;
alter table public.votes     enable row level security;

-- Profiles: users can read all profiles, only update their own.
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Words: everyone can read approved words; authenticated users can insert.
create policy "words_select_approved" on public.words
  for select using (status = 'approved' or auth.uid() = submitted_by);

create policy "words_insert_authenticated" on public.words
  for insert with check (auth.role() = 'authenticated');

-- Admins can update word status directly.
create policy "words_update_admin" on public.words
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Votes: approvers and admins can insert/read.
create policy "votes_select" on public.votes for select using (auth.role() = 'authenticated');

create policy "votes_insert_approver" on public.votes
  for insert with check (
    (select role from public.profiles where id = auth.uid()) in ('approver', 'admin')
  );
