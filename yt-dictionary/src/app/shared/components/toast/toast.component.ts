import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  toastService = inject(ToastService);

  alertClass(type: Toast['type']): string {
    const map: Record<Toast['type'], string> = {
      success: 'alert-success',
      error: 'alert-error',
      warning: 'alert-warning',
      info: 'alert-info',
    };
    return `alert ${map[type]} shadow-lg`;
  }
}
