import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
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
  private toastService = inject(ToastService);

  loading = signal(true);
  error = signal<string | null>(null);
  profiles = signal<Profile[]>([]);
  updatingIds = signal<string[]>([]);

  readonly roles: UserRole[] = ['reader', 'approver', 'admin'];

  get readerCount(): number   { return this.profiles().filter(p => p.role === 'reader').length; }
  get approverCount(): number { return this.profiles().filter(p => p.role === 'approver').length; }
  get adminCount(): number    { return this.profiles().filter(p => p.role === 'admin').length; }

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
    if (!profile || this.isCurrentUser(userId) || this.isUpdating(userId) || profile.role === role) {
      return;
    }

    this.updatingIds.update(ids => [...ids, userId]);
    this.profiles.update(ps => ps.map(p => (p.id === userId ? { ...p, role } : p)));

    try {
      await this.profileService.updateRole(userId, role);
      this.toastService.success(`@${profile.username} is now ${role}`);
    } catch {
      this.toastService.error('Failed to update role. Please try again.');
      await this.load();
    } finally {
      this.updatingIds.update(ids => ids.filter(id => id !== userId));
    }
  }

  roleBadgeClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      admin:    'badge badge-primary badge-sm',
      approver: 'badge badge-secondary badge-sm',
      reader:   'badge badge-ghost badge-sm',
    };
    return map[role];
  }

  roleButtonClass(profile: Profile, role: UserRole): string {
    if (profile.role === role) {
      const active: Record<UserRole, string> = {
        admin:    'btn-primary',
        approver: 'btn-secondary',
        reader:   'btn-neutral',
      };
      return active[role];
    }
    return 'btn-ghost border border-base-300';
  }
}
