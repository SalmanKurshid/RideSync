import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'rs-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <h1>Hello, {{ auth.user()?.name }}</h1>
      <p>Your rides, fuel, and spending will appear here.</p>
    </header>

    <section class="card next">
      <h2>Getting set up</h2>
      <ol>
        <li>Add the motorcycle you ride.</li>
        <li>Plan a trip and let RideSync work out the fuel and cost.</li>
        <li>Log expenses and fills as you go.</li>
      </ol>
      <p class="note">Bike and trip management arrive in the next phases.</p>
    </section>
  `,
  styles: [
    `
      .head { margin-bottom: 1.5rem; }
      .head p { margin: 0.25rem 0 0; color: var(--ink-3); }
      .next { padding: 1.25rem 1.5rem; max-width: 40rem; }
      .next h2 { margin-bottom: 0.5rem; }
      ol { margin: 0; padding-left: 1.2rem; color: var(--ink-2); display: grid; gap: 0.3rem; }
      .note {
        margin: 1rem 0 0;
        padding-top: 0.85rem;
        border-top: 1px solid var(--line);
        font-size: 0.85rem;
        color: var(--ink-3);
      }
    `,
  ],
})
export class Dashboard {
  protected readonly auth = inject(AuthStore);
}
