export const STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  applied: ['viewed'],
  viewed: ['in-review'],
  'in-review': ['interview', 'test-task', 'offer', 'rejected'],
  interview: ['offer', 'rejected'],
  'test-task': ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: [],
}

export function canTransitionTo(from: string, to: string): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export interface ApplicationAccessView {
  user?: { id: number } | null
  vacancy?: { postedBy?: { id: number } | null } | null
}

export function canViewApplication(application: ApplicationAccessView, userId: number): boolean {
  if (application.user?.id === userId) return true
  if (application.vacancy?.postedBy?.id === userId) return true
  return false
}
