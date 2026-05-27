-- ============================================================
-- YT Dictionary – Migration 002: Voting RLS & Reject Logic
-- Run this in your Supabase project: SQL Editor > New Query
-- ============================================================

-- ── 1. Let approvers and admins see all pending words ────────
-- The existing "words_select_approved" policy only lets users
-- see approved words or their own submissions. Approvers need
-- to see every pending word to build the review queue.
-- Multiple SELECT policies are OR'd by Postgres, so this adds
-- to the existing policy without replacing it.
create policy "words_select_pending_approvers" on public.words
  for select using (
    status = 'pending' and
    (select role from public.profiles where id = auth.uid()) in ('approver', 'admin')
  );

-- ── 2. Let approvers update their own vote ───────────────────
-- The original schema only had an INSERT policy for votes.
-- Upserting an existing vote (changing approve ↔ reject)
-- requires an UPDATE policy too.
create policy "votes_update_own" on public.votes
  for update using (voter_id = auth.uid())
              with check (voter_id = auth.uid());

-- ── 3. Add rejection logic to the vote trigger ───────────────
-- The original trigger only handled auto-approval. This version
-- also auto-rejects when a majority votes to reject, and only
-- transitions words that are still pending.
create or replace function public.handle_vote_cast()
returns trigger language plpgsql security definer as $$
declare
  v_approver_count  int;
  v_approve_votes   int;
  v_reject_votes    int;
begin
  select count(*) into v_approver_count
  from public.profiles where role in ('approver', 'admin');

  select
    count(*) filter (where decision = 'approve'),
    count(*) filter (where decision = 'reject')
  into v_approve_votes, v_reject_votes
  from public.votes
  where word_id = new.word_id;

  if v_approver_count > 0 and v_approve_votes > (v_approver_count / 2.0) then
    update public.words
    set status = 'approved', reviewed_at = now()
    where id = new.word_id and status = 'pending';
  elsif v_approver_count > 0 and v_reject_votes > (v_approver_count / 2.0) then
    update public.words
    set status = 'rejected', reviewed_at = now()
    where id = new.word_id and status = 'pending';
  end if;

  return new;
end;
$$;
