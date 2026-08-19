import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'rs-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty card">
      <h2>{{ heading() }}</h2>
      <p>{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styles: [
    `
      .empty {
        display: grid;
        justify-items: center;
        gap: 0.5rem;
        padding: 3rem 1.5rem;
        text-align: center;
      }
      p { margin: 0; color: var(--ink-3); max-width: 34ch; }
      .empty ::ng-deep .btn { margin-top: 0.5rem; }
    `,
  ],
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
}
