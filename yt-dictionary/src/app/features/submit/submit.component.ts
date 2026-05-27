import { Component, computed, inject, signal } from '@angular/core';
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

// Custom validator: rejects strings that are only whitespace.
// Angular's Validators.required passes for "   " (spaces), so we add this.
// A validator is simply a function: AbstractControl → ValidationErrors | null.
// Returning null means "valid". Returning an object means "invalid" —
// the key names the error, used in the template with hasError().
function notBlank(control: AbstractControl): ValidationErrors | null {
  return control.value?.trim().length > 0 ? null : { blank: true };
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

  // computed() signals that derive their value from the form controls.
  // These update live as the user types — no event listeners needed.
  definitionLength = computed(() => this.form.get('definition')?.value?.length ?? 0);
  exampleLength = computed(() => this.form.get('example')?.value?.length ?? 0);

  async submit(): Promise<void> {
    if (this.form.invalid) {
      // Mark all fields as touched so validation messages appear
      // even if the user clicked submit without touching the fields.
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
      await this.wordService.submitWord(
        term!,
        definition!,
        example || null,
        userId
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
