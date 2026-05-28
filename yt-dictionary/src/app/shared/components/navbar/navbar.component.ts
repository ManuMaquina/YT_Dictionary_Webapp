import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  auth = inject(AuthService);

  roleBadgeClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      admin: 'badge badge-primary badge-sm',
      approver: 'badge badge-secondary badge-sm',
      reader: 'badge badge-ghost badge-sm',
    };
    return map[role];
  }
}
