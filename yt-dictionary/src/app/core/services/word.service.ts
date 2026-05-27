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
}
