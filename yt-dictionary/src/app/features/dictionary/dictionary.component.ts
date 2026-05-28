import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WordService } from '../../core/services/word.service';
import { AuthService } from '../../core/auth/auth.service';
import { Word } from '../../core/models/word.model';

@Component({
  selector: 'app-dictionary',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dictionary.component.html',
})
export class DictionaryComponent implements OnInit {
  private wordService = inject(WordService);
  auth = inject(AuthService);

  // Raw data from the database
  words = signal<Word[]>([]);

  // What the user has typed into the search box
  searchTerm = signal('');

  // UI state
  loading = signal(true);
  error = signal<string | null>(null);

  // Derived signal: recomputes automatically whenever words() or searchTerm() changes.
  // No manual subscription or event wiring needed.
  filteredWords = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.words();
    return this.words().filter(
      w =>
        w.term.toLowerCase().includes(term) ||
        w.definition.toLowerCase().includes(term)
    );
  });

  // ngOnInit is an Angular lifecycle hook that runs once, after the
  // component's inputs are set and it's ready to work. The right place
  // to trigger async data loading.
  async ngOnInit(): Promise<void> {
    try {
      const data = await this.wordService.getApprovedWords();
      this.words.set(data);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load words.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}
