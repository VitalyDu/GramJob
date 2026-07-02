export const REJECTION_REASONS = [
  'spam',
  'fake',
  'inappropriate',
  'incomplete',
  'wrong_category',
  'salary_mismatch',
  'contact_info',
  'other',
] as const

export type RejectionReason = (typeof REJECTION_REASONS)[number]

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  spam: 'Спам или дублирующийся контент',
  fake: 'Фиктивная вакансия/компания',
  inappropriate: 'Неприемлемый контент',
  incomplete: 'Недостаточно информации',
  wrong_category: 'Неправильная категория',
  salary_mismatch: 'Некорректные данные о зарплате',
  contact_info: 'Контактные данные в запрещённых полях',
  other: 'Другое',
}

export function rejectionReasonLabel(reason?: string | null): string {
  if (reason && (REJECTION_REASONS as readonly string[]).includes(reason)) {
    return REJECTION_REASON_LABELS[reason as RejectionReason]
  }
  return 'см. детали'
}

export const MODERATABLE_ENTITIES = {
  vacancy: 'api::vacancy.vacancy',
  resume: 'api::resume.resume',
  company: 'api::company.company',
} as const

export type ModeratableEntityType = keyof typeof MODERATABLE_ENTITIES

export function isModeratableEntity(value: string): value is ModeratableEntityType {
  return value in MODERATABLE_ENTITIES
}

export function validateRejection(reason: unknown, comment: unknown): string | null {
  if (typeof reason !== 'string' || !(REJECTION_REASONS as readonly string[]).includes(reason)) {
    return 'INVALID_REASON'
  }
  if (reason === 'other' && (typeof comment !== 'string' || comment.trim().length === 0)) {
    return 'COMMENT_REQUIRED'
  }
  return null
}

export interface ModerationLogEntry {
  entityType: string
  entityDocumentId: string
  action: string
  createdAt: string | Date
}

export function computeAvgProcessingHours(logs: ModerationLogEntry[]): number | null {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const lastSubmitted = new Map<string, number>()
  const durations: number[] = []

  for (const entry of sorted) {
    const key = `${entry.entityType}:${entry.entityDocumentId}`
    const ts = new Date(entry.createdAt).getTime()

    if (entry.action === 'submitted') {
      lastSubmitted.set(key, ts)
      continue
    }

    if (entry.action === 'approved' || entry.action === 'rejected') {
      const submittedAt = lastSubmitted.get(key)
      if (submittedAt !== undefined && ts >= submittedAt) {
        durations.push((ts - submittedAt) / 3_600_000)
        lastSubmitted.delete(key)
      }
    }
  }

  if (durations.length === 0) return null
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length
  return Math.round(avg * 10) / 10
}
