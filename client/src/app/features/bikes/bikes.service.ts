import { inject, Injectable, signal } from '@angular/core';
import { tap, type Observable } from 'rxjs';
import type { Bike, BikeInput } from '@ridesync/shared';
import { ApiService } from '../../core/services/api.service';

/**
 * Owns the rider's bike list. Mutations refresh the local signal from the
 * server's response rather than guessing at the new state, which matters here
 * because adding or removing a bike can move the default flag to another row.
 */
@Injectable({ providedIn: 'root' })
export class BikesService {
  private readonly api = inject(ApiService);

  private readonly items = signal<readonly Bike[]>([]);
  private readonly loading = signal(false);

  readonly bikes = this.items.asReadonly();
  readonly isLoading = this.loading.asReadonly();

  load(): Observable<Bike[]> {
    this.loading.set(true);
    return this.api.get<Bike[]>('/bikes').pipe(
      tap({
        next: (bikes) => {
          this.items.set(bikes);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getById(bikeId: string): Observable<Bike> {
    return this.api.get<Bike>(`/bikes/${bikeId}`);
  }

  create(input: BikeInput): Observable<Bike> {
    return this.api.post<Bike>('/bikes', input);
  }

  update(bikeId: string, input: BikeInput): Observable<Bike> {
    return this.api.put<Bike>(`/bikes/${bikeId}`, input);
  }

  setDefault(bikeId: string): Observable<Bike> {
    return this.api.patch<Bike>(`/bikes/${bikeId}/default`);
  }

  remove(bikeId: string): Observable<void> {
    return this.api.delete(`/bikes/${bikeId}`);
  }
}
