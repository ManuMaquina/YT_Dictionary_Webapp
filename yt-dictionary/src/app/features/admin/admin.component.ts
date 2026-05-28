import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { Profile, UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);
  profiles = signal<Profile[]>([]);
  // Tracks user IDs with an in-flight role-change request so we can
  // disable controls while the server round-trip completes.
  updatingIds = signal<string[]>([]);

  // Ordered for display: ascending privilege level.
  readonly roles: UserRole[] = ['reader', 'approver', 'admin'];

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.profiles.set(await this.profileService.getAllProfiles());
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      this.loading.set(false);
    }
  }

  isCurrentUser(userId: string): boolean {
    return this.auth.currentUser()?.id === userId;
  }

  isUpdating(userId: string): boolean {
    return this.updatingIds().includes(userId);
  }

  async setRole(userId: string, role: UserRole): Promise<void> {
    const profile = this.profiles().find(p => p.id === userId);
    // Skip if it's the current user, already updating, or the role didn't change.
    if (!profile || this.isCurrentUser(userId) || this.isUpdating(userId) || profile.role === role) {
      return;
    }

    this.updatingIds.update(ids => [...ids, userId]);

    // Optimistic update: reflect the change immediately so the UI
    // doesn't feel sluggish, then confirm or revert on the server response.
    this.profiles.update(ps => ps.map(p => (p.id === userId ? { ...p, role } : p)));

    try {
      await this.profileService.updateRole(userId, role);
    } catch {
      // Revert by reloading the full list from the server.
      await this.load();
    } finally {
      this.updatingIds.update(ids => ids.filter(id => id !== userId));
    }
  }

  // ── Class helpers ────────────────────────────────────────────
  // Full literal class strings are used so Tailwind's JIT scanner
  // can detect every class name at build time.

  roleBadgeClass(role: UserRole): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const colors: Record<UserRole, string> = {
      admin: 'bg-purple-100 text-purple-800',
      approver: 'bg-blue-100 text-blue-800',
      reader: 'bg-gray-100 text-gray-600',
    };
    return `${base} ${colors[role]}`;
  }

  get readerCount(): number { return this.profiles().filter(p => p.role === 'reader').length; }
  get approverCount(): number { return this.profiles().filter(p => p.role === 'approver').length; }
  get adminCount(): number { return this.profiles().filter(p => p.role === 'admin').length; }

  roleButtonClass(profile: Profile, role: UserRole): string {
    const base = 'px-3 py-1.5 rounded-md text-xs font-medium transition-colors';
    const active: Record<UserRole, string> = {
      admin: 'bg-purple-600 text-white',
      approver: 'bg-blue-600 text-white',
      reader: 'bg-gray-600 text-white',
    };
    const inactive = 'bg-gray-100 text-gray-500 hover:bg-gray-200';
    return `${base} ${profile.role === role ? active[role] : inactive}`;
  }
}
