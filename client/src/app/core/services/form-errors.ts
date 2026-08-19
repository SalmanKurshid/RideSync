import { HttpErrorResponse } from '@angular/common/http';
import type { FormGroup } from '@angular/forms';
import type { ApiError } from '@ridesync/shared';

/**
 * Pushes server-side field messages back onto the matching controls, so a
 * rejected form shows the reason next to the field rather than in a toast.
 * Returns any message that had no matching control, for display as a summary.
 */
export function applyServerErrors(form: FormGroup, error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }

  const body = error.error as Partial<ApiError> | null;
  const apiError = body?.error;

  if (!apiError) {
    return error.status === 0
      ? 'Cannot reach the server. Check your connection.'
      : 'Something went wrong. Please try again.';
  }

  const details = apiError.details;
  if (!details) {
    return apiError.message;
  }

  let unmatched: string | null = null;
  for (const [field, messages] of Object.entries(details)) {
    const control = form.get(field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: messages[0] });
      control.markAsTouched();
    } else {
      unmatched ??= messages[0] ?? apiError.message;
    }
  }

  return unmatched;
}

/** First message to show for a control, server-supplied or local. */
export function controlError(form: FormGroup, path: string, label: string): string | null {
  const control = form.get(path);
  if (!control || !control.touched || !control.errors) return null;

  const errors = control.errors;
  if (errors['server']) return String(errors['server']);
  if (errors['required']) return `${label} is required.`;
  if (errors['email']) return 'Enter a valid email address.';
  if (errors['minlength']) return `${label} needs at least ${errors['minlength'].requiredLength} characters.`;
  if (errors['maxlength']) return `${label} must be under ${errors['maxlength'].requiredLength} characters.`;
  if (errors['min']) return `${label} must be at least ${errors['min'].min}.`;
  if (errors['max']) return `${label} must be at most ${errors['max'].max}.`;
  return `${label} is not valid.`;
}
