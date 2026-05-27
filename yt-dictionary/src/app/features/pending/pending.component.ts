import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { WordService } from '../../core/services/word.service';
import { Word } from '../../core/models/word.model';

// Extends Word with aggregated vote data for the review queue UI.
interface PendingWordVM extends Word {
  approveCount: number;
  rejectCount: number;
  userVote: 'approve' | 'reject' | null;
}

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './pending.component.html',
})
export class PendingComponent implements OnInit {
  private wordService = inject(WordService);
  private auth = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);
  words = signal<PendingWordVM[]>([]);
  totalApprovers = signal(0);
  // Tracks which word IDs have an in-flight vote request so we can
  // disable both buttons while the server round-trip completes.
  votingWordIds = signal<string[]>([]);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [rawWords, approverCount] = await Promise.all([
        this.wordService.getPendingWords(),
        this.wordService.getApproverCount(),
      ]);

      this.totalApprovers.set(approverCount);

      if (rawWords.length === 0) {
        this.words.set([]);
        return;
      }

      const wordIds = rawWords.map(w => w.id);
      const votes = await this.wordService.getVotesForWords(wordIds);
      const userId = this.auth.currentUser()?.id;

      this.words.set(
        rawWords.map(word => {
          const wv = votes.filter(v => v.word_id === word.id);
          return {
            ...word,
            approveCount: wv.filter(v => v.decision === 'approve').length,
            rejectCount: wv.filter(v => v.decision === 'reject').length,
            userVote: wv.find(v => v.voter_id === userId)?.decision ?? null,
          };
        })
      );
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load pending submissions.');
    } finally {
      this.loading.set(false);
    }
  }

  isVoting(wordId: string): boolean {
    return this.votingWordIds().includes(wordId);
  }

  async vote(wordId: string, decision: 'approve' | 'reject'): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (!userId || this.isVoting(wordId)) return;

    this.votingWordIds.update(ids => [...ids, wordId]);

    // Optimistic update: reflect the new vote immediately so the UI
    // feels instant, then confirm or revert based on the server response.
    this.words.update(ws =>
      ws.map(w => {
        if (w.id !== wordId) return w;
        const prev = w.userVote;
        return {
          ...w,
          userVote: decision,
          approveCount:
            w.approveCount +
            (decision === 'approve' ? 1 : 0) -
            (prev === 'approve' ? 1 : 0),
          rejectCount:
            w.rejectCount +
            (decision === 'reject' ? 1 : 0) -
            (prev === 'reject' ? 1 : 0),
        };
      })
    );

    try {
      await this.wordService.castVote(wordId, userId, decision);

      // Remove the word from the queue once a majority has voted.
      // The DB trigger already changed the word's status; we just
      // clean up the local list to match.
      const majority = this.totalApprovers() / 2.0;
      this.words.update(ws =>
        ws.filter(w => {
          if (w.id !== wordId) return true;
          return w.approveCount <= majority && w.rejectCount <= majority;
        })
      );
    } catch {
      // On error, reload from the server to restore a consistent state.
      await this.load();
    } finally {
      this.votingWordIds.update(ids => ids.filter(id => id !== wordId));
    }
  }

  // Returns the full Tailwind class string for an approve or reject
  // button. Full literal strings are used so Tailwind's JIT scanner
  // can detect every class name at build time.
  approveClass(word: PendingWordVM): string {
    const base =
      'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors';
    const active = 'bg-green-600 text-white hover:bg-green-700';
    const inactive =
      'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700 border border-gray-200';
    const disabledCls = 'opacity-50 cursor-not-allowed';
    return [
      base,
      word.userVote === 'approve' ? active : inactive,
      this.isVoting(word.id) ? disabledCls : '',
    ].join(' ');
  }

  rejectClass(word: PendingWordVM): string {
    const base =
      'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors';
    const active = 'bg-red-600 text-white hover:bg-red-700';
    const inactive =
      'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700 border border-gray-200';
    const disabledCls = 'opacity-50 cursor-not-allowed';
    return [
      base,
      word.userVote === 'reject' ? active : inactive,
      this.isVoting(word.id) ? disabledCls : '',
    ].join(' ');
  }
}
