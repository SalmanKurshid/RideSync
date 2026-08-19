import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Rendered by the parent only while a confirmation is pending, so there is no
 * hidden dialog sitting in the DOM and no shared global state to reset.
 */
@Component({
  selector: 'rs-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="cancelled.emit()">
      <div
        class="panel card"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-label]="heading()"
        (click)="$event.stopPropagation()"
      >
        <h2>{{ heading() }}</h2>
        <p>{{ message() }}</p>
        <div class="actions">
          <button class="btn btn-ghost" type="button" (click)="cancelled.emit()" [disabled]="busy()">
            Cancel
          </button>
          <button class="btn btn-danger" type="button" (click)="confirmed.emit()" [disabled]="busy()">
            {{ busy() ? 'Working…' : confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: rgb(9 18 17 / 45%);
        z-index: 40;
      }
      .panel { width: min(26rem, 100%); padding: 1.35rem; display: grid; gap: 0.6rem; }
      p { margin: 0; color: var(--ink-2); }
      .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.4rem; }
    `,
  ],
})
export class ConfirmDialog {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Delete');
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
