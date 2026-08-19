import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<readonly Toast[]>([]);

  show(message: string, tone: ToastTone = 'info'): void {
    const toast: Toast = { id: (this.nextId += 1), tone, message };
    this.toasts.update((current) => [...current, toast]);
    setTimeout(() => this.dismiss(toast.id), tone === 'error' ? 6000 : 3500);
  }

  success = (message: string): void => this.show(message, 'success');
  error = (message: string): void => this.show(message, 'error');

  dismiss(id: number): void {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}
