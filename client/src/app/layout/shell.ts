import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth/auth.store';

interface NavItem {
  path: string;
  label: string;
}

@Component({
  selector: 'rs-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styleUrl: './shell.scss',
  template: `
    <div class="shell">
      <aside>
        <a class="brand" routerLink="/dashboard">
          <span class="mark">RideSync</span>
        </a>

        <nav>
          @for (item of nav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>

        <div class="rider">
          <div class="who">
            <span class="name">{{ auth.user()?.name }}</span>
            <span class="email">{{ auth.user()?.email }}</span>
          </div>
          <button class="btn btn-ghost" type="button" (click)="signOut()">Sign out</button>
        </div>
      </aside>

      <main>
        <router-outlet />
      </main>
    </div>
  `,
})
export class Shell {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  // Trips arrive in phase 3.
  protected readonly nav: readonly NavItem[] = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/bikes', label: 'Garage' },
  ];

  protected signOut(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      // Even if the call fails, the local session should not linger.
      error: () => {
        this.auth.clear();
        void this.router.navigateByUrl('/login');
      },
    });
  }
}
