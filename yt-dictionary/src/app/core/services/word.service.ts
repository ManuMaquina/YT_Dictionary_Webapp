import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { Word } from '../models/word.model';

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
}
