import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'rs-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="toast.tone">
          <span>{{ toast.message }}</span>
          <button type="button" (click)="toasts.dismiss(toast.id)" aria-label="Dismiss">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .stack {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        display: grid;
        gap: 0.5rem;
        z-index: 50;
        max-width: min(24rem, calc(100vw - 2rem));
      }
      .toast {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.7rem 0.85rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--line-2);
        background: var(--surface);
        box-shadow: var(--shadow);
        font-size: 0.88rem;
      }
      .toast.error { border-color: var(--risk); background: var(--risk-soft); color: var(--risk); }
      .toast.success { border-color: var(--ok); background: var(--ok-soft); color: var(--ok); }
      button {
        margin-left: auto;
        border: 0;
        background: none;
        color: inherit;
        font-size: 1.1rem;
        line-height: 1;
        cursor: pointer;
      }
    `,
  ],
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
}
