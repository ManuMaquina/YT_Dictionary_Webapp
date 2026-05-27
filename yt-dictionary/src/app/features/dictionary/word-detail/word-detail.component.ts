import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { WordService } from '../../../core/services/word.service';
import { Word } from '../../../core/models/word.model';

@Component({
  selector: 'app-word-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './word-detail.component.html',
})
export class WordDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private wordService = inject(WordService);

  word = signal<Word | null>(null);
  loading = signal(true);
  notFound = signal(false);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // ActivatedRoute.snapshot gives a one-time read of the current route.
    // params['term'] matches the :term placeholder defined in app.routes.ts.
    const term = this.route.snapshot.params['term'];

    try {
      const data = await this.wordService.getWordByTerm(term);
      if (data) {
        this.word.set(data);
      } else {
        this.notFound.set(true);
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load word.');
    } finally {
      this.loading.set(false);
    }
  }
}
