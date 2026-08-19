import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { applyServerErrors, controlError } from '../../core/services/form-errors';

@Component({
  selector: 'rs-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrl: './auth-layout.scss',
  template: `
    <div class="panel card">
      <header class="brand">
        <span class="mark">RideSync</span>
        <h1>Plan your next ride</h1>
        <p>Track fuel, budget, and preparation for every trip you take.</p>
      </header>

      @if (formError()) {
        <p class="alert alert-error">{{ formError() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="name">Name</label>
          <input id="name" type="text" formControlName="name" autocomplete="name" />
          @if (error('name', 'Name'); as message) {
            <span class="error">{{ message }}</span>
          }
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" autocomplete="email" />
          @if (error('email', 'Email'); as message) {
            <span class="error">{{ message }}</span>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
          />
          @if (error('password', 'Password'); as message) {
            <span class="error">{{ message }}</span>
          } @else {
            <span class="hint">At least 8 characters.</span>
          }
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Creating account…' : 'Create account' }}
          </button>
          <p class="swap">Already riding with us? <a routerLink="/login">Sign in</a></p>
        </div>
      </form>
    </div>
  `,
})
export class Register {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form: FormGroup = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected error(path: string, label: string): string | null {
    return controlError(this.form, path, label);
  }

  protected submit(): void {
    if (this.submitting()) return;

    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }
}
