export type WordStatus = 'pending' | 'approved' | 'rejected';

export interface Word {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  status: WordStatus;
  submitted_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles: { username: string } | null; // joined from public.profiles
}
