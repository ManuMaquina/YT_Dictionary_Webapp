import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  messages = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info', durationMs = 4000): void {
    const id = crypto.randomUUID();
    this.messages.update(ts => [...ts, { id, type, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void   { this.show(message, 'error'); }
  info(message: string): void    { this.show(message, 'info'); }

  dismiss(id: string): void {
    this.messages.update(ts => ts.filter(t => t.id !== id));
  }
}
