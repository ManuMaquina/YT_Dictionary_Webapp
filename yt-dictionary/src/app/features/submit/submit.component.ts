import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { WordService } from '../../core/services/word.service';

function notBlank(control: AbstractControl): ValidationErrors | null {
  return control.value?.trim().length > 0 ? null : { blank: true };
}

// Wraps a promise with a timeout. Rejects if the promise doesn't
// resolve within `ms` milliseconds, preventing infinite loading states.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Check your connection and try again.')), ms)
  );
  return Promise.race([promise, timeout]);
}

@Component({
  selector: 'app-submit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './submit.component.html',
})
export class SubmitComponent {
  private fb = inject(FormBuilder);
  private wordService = inject(WordService);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);
  submittedTerm = signal('');

  form = this.fb.group({
    term: [
      '',
      [Validators.required, notBlank, Validators.minLength(2), Validators.maxLength(60)],
    ],
    definition: [
      '',
      [Validators.required, notBlank, Validators.minLength(10), Validators.maxLength(500)],
    ],
    example: ['', Validators.maxLength(300)],
  });

  // Helper getters so the template can read form control values cleanly.
  // Angular's change detection re-evaluates these on every keystroke,
  // so the character counters stay live without needing signals or observables.
  get definitionLength(): number {
    return this.form.get('definition')?.value?.length ?? 0;
  }

  get exampleLength(): number {
    return this.form.get('example')?.value?.length ?? 0;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { term, definition, example } = this.form.value;

    try {
      await withTimeout(
        this.wordService.submitWord(term!, definition!, example || null, userId),
        15000 // 15 second timeout
      );
      this.submittedTerm.set(term!);
      this.submitted.set(true);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      this.loading.set(false);
    }
  }

  submitAnother(): void {
    this.form.reset();
    this.submitted.set(false);
    this.error.set(null);
  }
}
