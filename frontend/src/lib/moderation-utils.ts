import type { ModerationRejectionReason } from '@/types/api'

export const REJECTION_REASONS: readonly ModerationRejectionReason[] = [
  'spam',
  'fake',
  'inappropriate',
  'incomplete',
  'wrong_category',
  'salary_mismatch',
  'contact_info',
  'other',
] as const

export function getRejectionReasonKey(reason?: string | null): string {
  if (reason && (REJECTION_REASONS as readonly string[]).includes(reason)) {
    return `moderation.reasons.${reason}`
  }
  return 'moderation.reasons.unknown'
}
