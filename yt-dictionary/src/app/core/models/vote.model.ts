export interface Vote {
  id: string;
  word_id: string;
  voter_id: string;
  decision: 'approve' | 'reject';
  created_at: string;
}
