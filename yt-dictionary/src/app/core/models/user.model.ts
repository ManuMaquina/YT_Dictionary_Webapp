export type UserRole = 'admin' | 'reader' | 'approver';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}
