import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, of, tap, type Observable } from 'rxjs';
import type { LoginRequest, RegisterRequest, User } from '@ridesync/shared';
import { ApiService } from '../services/api.service';

/**
 * Holds the signed-in rider. The session itself lives in an httpOnly cookie the
 * browser attaches automatically — this store only mirrors who that cookie
 * belongs to, which is why a page refresh has to ask the API again.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(ApiService);

  private readonly currentUser = signal<User | null>(null);
  private readonly resolved = signal(false);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  /** False until the first `/me` call settles, so guards do not redirect too early. */
  readonly isResolved = this.resolved.asReadonly();

  register(payload: RegisterRequest): Observable<User> {
    return this.api.post<User>('/auth/register', payload).pipe(tap((user) => this.setUser(user)));
  }

  login(payload: LoginRequest): Observable<User> {
    return this.api.post<User>('/auth/login', payload).pipe(tap((user) => this.setUser(user)));
  }

  logout(): Observable<void> {
    return this.api.postNoContent('/auth/logout').pipe(tap(() => this.clear()));
  }

  /** Called once at startup to restore the session after a refresh. */
  restoreSession(): Observable<User | null> {
    return this.api.get<User>('/auth/me').pipe(
      tap((user) => this.setUser(user)),
      catchError(() => {
        this.clear();
        return of(null);
      }),
    );
  }

  private setUser(user: User): void {
    this.currentUser.set(user);
    this.resolved.set(true);
  }

  clear(): void {
    this.currentUser.set(null);
    this.resolved.set(true);
  }
}
