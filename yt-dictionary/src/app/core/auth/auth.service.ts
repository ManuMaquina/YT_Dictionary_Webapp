import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../supabase/supabase.service';
import { Profile, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  currentUser = signal<Profile | null>(null);
  loading = signal(true);

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.set(false);
      return;
    }

    const { data: { session } } = await this.supabase.client.auth.getSession();
    if (session?.user) {
      await this.loadProfile(session.user.id);
    }
    this.loading.set(false);

    this.supabase.client.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await this.loadProfile(session.user.id);
      } else {
        this.currentUser.set(null);
      }
    });
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    this.currentUser.set(data);
  }

  async signIn(email: string, password: string) {
    return this.supabase.client.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string, username: string) {
    return this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
  }

  async signOut(): Promise<void> {
    try {
      await this.supabase.client.auth.signOut();
    } finally {
      // always clear local state and redirect, even if the server call fails
      this.currentUser.set(null);
      this.router.navigate(['/auth/login']);
    }
  }

  get isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  get role(): UserRole {
    return this.currentUser()?.role ?? 'reader';
  }

  hasRole(roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }
}
