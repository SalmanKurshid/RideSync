import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'rs-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <div>
        <h1>{{ heading() }}</h1>
        @if (subheading()) {
          <p>{{ subheading() }}</p>
        }
      </div>
      <div class="actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [
    `
      header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      p { margin: 0.2rem 0 0; color: var(--ink-3); }
      .actions { display: flex; gap: 0.5rem; }
    `,
  ],
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly subheading = input<string>();
}
