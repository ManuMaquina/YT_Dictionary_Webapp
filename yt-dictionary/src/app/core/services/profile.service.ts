import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { Profile, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private supabase = inject(SupabaseService);

  // Fetches every user profile, oldest first, for the admin panel.
  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data as Profile[]) ?? [];
  }

  // Updates a single user's role. Blocked at the DB level for non-admins
  // by the "profiles_update_admin" RLS policy and the
  // prevent_role_escalation trigger.
  async updateRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await this.supabase.client
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  }
}
