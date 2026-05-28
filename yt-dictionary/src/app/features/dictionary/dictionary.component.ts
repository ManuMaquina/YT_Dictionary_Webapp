import { Component, OnInit, ViewChild, ElementRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WordService } from '../../core/services/word.service';
import { AuthService } from '../../core/auth/auth.service';
import { Word } from '../../core/models/word.model';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-dictionary',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dictionary.component.html',
})
export class DictionaryComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private wordService = inject(WordService);
  auth = inject(AuthService);

  words = signal<Word[]>([]);
  searchTerm = signal('');
  currentPage = signal(1);
  loading = signal(true);
  error = signal<string | null>(null);

  filteredWords = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.words();
    return this.words().filter(
      w =>
        w.term.toLowerCase().includes(term) ||
        w.definition.toLowerCase().includes(term)
    );
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredWords().length / PAGE_SIZE)));

  pagedWords = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * PAGE_SIZE;
    return this.filteredWords().slice(start, start + PAGE_SIZE);
  });

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
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
    if (this.searchInput) this.searchInput.nativeElement.value = '';
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.max(1, Math.min(page, this.totalPages())));
  }

  pageRange = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  });
}
