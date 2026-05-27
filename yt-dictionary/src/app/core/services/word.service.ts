import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { Word } from '../models/word.model';
import { Vote } from '../models/vote.model';

@Injectable({ providedIn: 'root' })
export class WordService {
  private supabase = inject(SupabaseService);

  // Fetches all approved words, alphabetically sorted, with the
  // submitter's username joined from the profiles table.
  async getApprovedWords(): Promise<Word[]> {
    const { data, error } = await this.supabase.client
      .from('words')
      .select('*, profiles(username)')
      .eq('status', 'approved')
      .order('term', { ascending: true });

    if (error) throw new Error(error.message);
    return (data as Word[]) ?? [];
  }

  // Fetches a single approved word by its term (the URL slug).
  async getWordByTerm(term: string): Promise<Word | null> {
    const { data, error } = await this.supabase.client
      .from('words')
      .select('*, profiles(username)')
      .eq('status', 'approved')
      .eq('term', term)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Word | null;
  }

  // Inserts a new word with status 'pending'. The submitted_by field
  // links the word to the authenticated user's profile.
  async submitWord(
    term: string,
    definition: string,
    example: string | null,
    userId: string
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from('words')
      .insert({
        term: term.trim().toLowerCase(),
        definition: definition.trim(),
        example: example?.trim() || null,
        submitted_by: userId,
        status: 'pending',
      });

    if (error) {
      // Postgres error code 23505 = unique_violation.
      // Thrown when the term already exists in the words table.
      if (error.code === '23505') {
        throw new Error(`"${term}" already exists in the dictionary.`);
      }
      throw new Error(error.message);
    }
  }

  // Fetches all pending words for the approver review queue,
  // oldest first so earlier submissions are reviewed first.
  async getPendingWords(): Promise<Word[]> {
    const { data, error } = await this.supabase.client
      .from('words')
      .select('*, profiles(username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data as Word[]) ?? [];
  }

  // Fetches all votes cast for a given list of word IDs.
  // Used to compute per-word vote counts and the current user's vote.
  async getVotesForWords(wordIds: string[]): Promise<Vote[]> {
    if (wordIds.length === 0) return [];
    const { data, error } = await this.supabase.client
      .from('votes')
      .select('*')
      .in('word_id', wordIds);

    if (error) throw new Error(error.message);
    return (data as Vote[]) ?? [];
  }

  // Upserts a vote — inserts on first vote, updates if the approver
  // changes their mind. The DB trigger re-evaluates word status after
  // every vote insert or update.
  async castVote(wordId: string, voterId: string, decision: 'approve' | 'reject'): Promise<void> {
    const { error } = await this.supabase.client
      .from('votes')
      .upsert(
        { word_id: wordId, voter_id: voterId, decision },
        { onConflict: 'word_id,voter_id' }
      );

    if (error) throw new Error(error.message);
  }

  // Returns the total number of users who can vote (approver + admin roles).
  // Used to calculate the majority threshold displayed in the review queue.
  async getApproverCount(): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['approver', 'admin']);

    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}
