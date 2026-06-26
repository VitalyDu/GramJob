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
