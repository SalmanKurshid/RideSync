import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { BikeInput } from '@ridesync/shared';
import { BikesService } from './bikes.service';
import { PageHeader } from '../../shared/components/page-header';
import { applyServerErrors, controlError } from '../../core/services/form-errors';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'rs-bike-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, PageHeader],
  styleUrl: './bike-form.scss',
  template: `
    <rs-page-header
      [heading]="isEdit() ? 'Edit bike' : 'Add a bike'"
      subheading="These figures drive the fuel and cost estimate on every trip."
    />

    @if (loading()) {
      <p class="muted">Loading…</p>
    } @else {
      @if (formError()) {
        <p class="alert alert-error">{{ formError() }}</p>
      }

      <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="grid">
          <div class="field span-2">
            <label for="name">Bike name</label>
            <input id="name" type="text" formControlName="name" placeholder="My Hunter" />
            @if (error('name', 'Name'); as message) {
              <span class="error">{{ message }}</span>
            } @else {
              <span class="hint">What you call it — used to pick the bike when planning a trip.</span>
            }
          </div>

          <div class="field">
            <label for="brand">Brand</label>
            <input id="brand" type="text" formControlName="brand" placeholder="Royal Enfield" />
            @if (error('brand', 'Brand'); as message) {
              <span class="error">{{ message }}</span>
            }
          </div>

          <div class="field">
            <label for="model">Model</label>
            <input id="model" type="text" formControlName="model" placeholder="Hunter 350" />
            @if (error('model', 'Model'); as message) {
              <span class="error">{{ message }}</span>
            }
          </div>

          <div class="field">
            <label for="engineCc">Engine (cc)</label>
            <input id="engineCc" type="number" formControlName="engineCc" min="1" step="1" />
            @if (error('engineCc', 'Engine capacity'); as message) {
              <span class="error">{{ message }}</span>
            }
          </div>

          <div class="field">
            <label for="mileageKmpl">Mileage (km/l)</label>
            <input id="mileageKmpl" type="number" formControlName="mileageKmpl" min="0.01" step="0.01" />
            @if (error('mileageKmpl', 'Mileage'); as message) {
              <span class="error">{{ message }}</span>
            } @else {
              <span class="hint">Real-world average, not the brochure figure.</span>
            }
          </div>

          <div class="field">
            <label for="tankLitres">Fuel tank (litres)</label>
            <input id="tankLitres" type="number" formControlName="tankLitres" min="0.1" step="0.1" />
            @if (error('tankLitres', 'Tank capacity'); as message) {
              <span class="error">{{ message }}</span>
            }
          </div>

          <div class="field">
            <label for="odometerKm">Odometer (km)</label>
            <input id="odometerKm" type="number" formControlName="odometerKm" min="0" step="0.1" />
            @if (error('odometerKm', 'Odometer'); as message) {
              <span class="error">{{ message }}</span>
            }
          </div>

          <label class="check span-2">
            <input type="checkbox" formControlName="isDefault" />
            <span>Use this as my default bike</span>
          </label>
        </div>

        @if (rangePreview(); as range) {
          <p class="preview">
            Full tank range <strong class="num">{{ range }} km</strong>
            <span>— tank capacity × mileage. A quick check that the numbers look right.</span>
          </p>
        }

        <footer>
          <a class="btn btn-ghost" routerLink="/bikes">Cancel</a>
          <button class="btn btn-primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Add bike' }}
          </button>
        </footer>
      </form>
    }
  `,
})
export class BikeForm implements OnInit {
  /** Bound from the route by `withComponentInputBinding`. */
  readonly bikeId = input<string>();

  private readonly bikes = inject(BikesService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly isEdit = computed(() => this.bikeId() !== undefined);

  protected readonly form: FormGroup = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    brand: ['', [Validators.required, Validators.maxLength(40)]],
    model: ['', [Validators.required, Validators.maxLength(60)]],
    engineCc: [350, [Validators.required, Validators.min(1), Validators.max(5000)]],
    mileageKmpl: [30, [Validators.required, Validators.min(0.01), Validators.max(999.99)]],
    tankLitres: [13, [Validators.required, Validators.min(0.1), Validators.max(999.99)]],
    odometerKm: [0, [Validators.required, Validators.min(0)]],
    isDefault: [false],
  });

  ngOnInit(): void {
    const id = this.bikeId();
    if (!id) return;

    this.loading.set(true);
    this.bikes.getById(id).subscribe({
      next: (bike) => {
        this.form.patchValue({
          name: bike.name,
          brand: bike.brand,
          model: bike.model,
          engineCc: bike.engineCc,
          mileageKmpl: Number(bike.mileageKmpl),
          tankLitres: Number(bike.tankLitres),
          odometerKm: Number(bike.odometerKm),
          isDefault: bike.isDefault,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/bikes');
      },
    });
  }

  protected error(path: string, label: string): string | null {
    return controlError(this.form, path, label);
  }

  protected rangePreview(): string | null {
    const { tankLitres, mileageKmpl } = this.form.getRawValue() as {
      tankLitres: number;
      mileageKmpl: number;
    };
    if (!tankLitres || !mileageKmpl || tankLitres <= 0 || mileageKmpl <= 0) return null;
    return Math.round(tankLitres * mileageKmpl).toLocaleString('en-IN');
  }

  protected submit(): void {
    if (this.saving()) return;

    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = this.form.getRawValue() as BikeInput;
    const id = this.bikeId();
    const request = id ? this.bikes.update(id, payload) : this.bikes.create(payload);

    request.subscribe({
      next: (bike) => {
        this.toast.success(id ? `${bike.name} updated.` : `${bike.name} added to your garage.`);
        void this.router.navigateByUrl('/bikes');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }
}
