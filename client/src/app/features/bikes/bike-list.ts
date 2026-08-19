import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Bike } from '@ridesync/shared';
import { BikesService } from './bikes.service';
import { PageHeader } from '../../shared/components/page-header';
import { EmptyState } from '../../shared/components/empty-state';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { DecimalFormatPipe } from '../../shared/pipes/decimal-format.pipe';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'rs-bike-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, EmptyState, ConfirmDialog, DecimalFormatPipe],
  styleUrl: './bike-list.scss',
  template: `
    <rs-page-header heading="Your garage" subheading="The motorcycles you ride and plan trips on">
      <a class="btn btn-primary" routerLink="/bikes/new">Add a bike</a>
    </rs-page-header>

    @if (bikes.isLoading() && bikes.bikes().length === 0) {
      <p class="muted">Loading your garage…</p>
    } @else if (bikes.bikes().length === 0) {
      <rs-empty-state
        heading="No bikes yet"
        message="Add the motorcycle you ride and RideSync can work out fuel and cost for every trip you plan."
      >
        <a class="btn btn-primary" routerLink="/bikes/new">Add your first bike</a>
      </rs-empty-state>
    } @else {
      <ul class="garage">
        @for (bike of bikes.bikes(); track bike.id) {
          <li class="bike card">
            <header>
              <div class="title">
                <h2>{{ bike.name }}</h2>
                @if (bike.isDefault) {
                  <span class="badge">Default</span>
                }
              </div>
              <p class="model">{{ bike.brand }} {{ bike.model }} · {{ bike.engineCc }}cc</p>
            </header>

            <dl class="stats">
              <div>
                <dt>Mileage</dt>
                <dd class="num">{{ bike.mileageKmpl | rsNumber }} <span>km/l</span></dd>
              </div>
              <div>
                <dt>Tank</dt>
                <dd class="num">{{ bike.tankLitres | rsNumber }} <span>L</span></dd>
              </div>
              <div>
                <dt>Range</dt>
                <dd class="num">{{ range(bike) | rsNumber: 0 }} <span>km</span></dd>
              </div>
              <div>
                <dt>Odometer</dt>
                <dd class="num">{{ bike.odometerKm | rsNumber: 1 }} <span>km</span></dd>
              </div>
            </dl>

            <footer>
              @if (!bike.isDefault) {
                <button
                  class="btn btn-ghost"
                  type="button"
                  [disabled]="pendingDefaultId() === bike.id"
                  (click)="makeDefault(bike)"
                >
                  {{ pendingDefaultId() === bike.id ? 'Setting…' : 'Make default' }}
                </button>
              }
              <a class="btn btn-ghost" [routerLink]="['/bikes', bike.id, 'edit']">Edit</a>
              <button class="btn btn-danger" type="button" (click)="askToDelete(bike)">Delete</button>
            </footer>
          </li>
        }
      </ul>
    }

    @if (pendingDelete(); as bike) {
      <rs-confirm-dialog
        heading="Delete this bike?"
        [message]="
          'This removes ' + bike.name + ' from your garage. Trips that already used it must be reassigned first.'
        "
        [busy]="deleting()"
        (confirmed)="confirmDelete(bike)"
        (cancelled)="pendingDelete.set(null)"
      />
    }
  `,
})
export class BikeList implements OnInit {
  protected readonly bikes = inject(BikesService);
  private readonly toast = inject(ToastService);

  protected readonly pendingDelete = signal<Bike | null>(null);
  protected readonly deleting = signal(false);
  protected readonly pendingDefaultId = signal<string | null>(null);

  ngOnInit(): void {
    this.bikes.load().subscribe({ error: () => undefined });
  }

  /** Distance on a full tank — a quick sanity check on the numbers entered. */
  protected range(bike: Bike): string {
    return String(Number(bike.tankLitres) * Number(bike.mileageKmpl));
  }

  protected makeDefault(bike: Bike): void {
    if (this.pendingDefaultId()) return;
    this.pendingDefaultId.set(bike.id);

    this.bikes.setDefault(bike.id).subscribe({
      next: () => {
        this.pendingDefaultId.set(null);
        this.toast.success(`${bike.name} is now your default bike.`);
        this.bikes.load().subscribe({ error: () => undefined });
      },
      error: () => this.pendingDefaultId.set(null),
    });
  }

  protected askToDelete(bike: Bike): void {
    this.pendingDelete.set(bike);
  }

  protected confirmDelete(bike: Bike): void {
    if (this.deleting()) return;
    this.deleting.set(true);

    this.bikes.remove(bike.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success(`${bike.name} removed from your garage.`);
        this.bikes.load().subscribe({ error: () => undefined });
      },
      error: () => {
        // The interceptor surfaces the reason, which names the blocking trips.
        this.deleting.set(false);
        this.pendingDelete.set(null);
      },
    });
  }
}
