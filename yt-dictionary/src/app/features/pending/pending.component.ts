import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { WordService } from '../../core/services/word.service';
import { ToastService } from '../../core/services/toast.service';
import { Word } from '../../core/models/word.model';

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
  private toastService = inject(ToastService);

  loading = signal(true);
  error = signal<string | null>(null);
  words = signal<PendingWordVM[]>([]);
  totalApprovers = signal(0);
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
      this.toastService.success(decision === 'approve' ? 'Vote: approved' : 'Vote: rejected');

      const majority = this.totalApprovers() / 2.0;
      this.words.update(ws =>
        ws.filter(w => {
          if (w.id !== wordId) return true;
          return w.approveCount <= majority && w.rejectCount <= majority;
        })
      );
    } catch {
      this.toastService.error('Failed to cast vote. Please try again.');
      await this.load();
    } finally {
      this.votingWordIds.update(ids => ids.filter(id => id !== wordId));
    }
  }

  approveClass(word: PendingWordVM): string {
    const base = 'btn btn-sm gap-1';
    return base + ' ' + (word.userVote === 'approve' ? 'btn-success' : 'btn-ghost border border-base-300');
  }

  rejectClass(word: PendingWordVM): string {
    const base = 'btn btn-sm gap-1';
    return base + ' ' + (word.userVote === 'reject' ? 'btn-error' : 'btn-ghost border border-base-300');
  }
}
