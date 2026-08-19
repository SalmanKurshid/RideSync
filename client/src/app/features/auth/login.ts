import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { applyServerErrors, controlError } from '../../core/services/form-errors';

@Component({
  selector: 'rs-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrl: './auth-layout.scss',
  template: `
    <div class="panel card">
      <header class="brand">
        <span class="mark">RideSync</span>
        <h1>Welcome back</h1>
        <p>Sign in to pick up where your last ride left off.</p>
      </header>

      @if (formError()) {
        <p class="alert alert-error">{{ formError() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            [attr.aria-invalid]="error('email', 'Email') ? 'true' : null"
          />
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
            autocomplete="current-password"
            [attr.aria-invalid]="error('password', 'Password') ? 'true' : null"
          />
          @if (error('password', 'Password'); as message) {
            <span class="error">{{ message }}</span>
          }
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
          </button>
          <p class="swap">New here? <a routerLink="/register">Create an account</a></p>
        </div>
      </form>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form: FormGroup = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected error(path: string, label: string): string | null {
    return controlError(this.form, path, label);
  }

  protected submit(): void {
    // Guards against a double-click posting the same credentials twice.
    if (this.submitting()) return;

    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }
}
