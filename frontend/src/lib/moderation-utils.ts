import type { ModerationRejectionReason } from '@/types/api'

export const REJECTION_REASON_LABELS: Record<ModerationRejectionReason, string> = {
  spam: 'Спам или дублирующийся контент',
  fake: 'Фиктивная вакансия/компания',
  inappropriate: 'Неприемлемый контент',
  incomplete: 'Недостаточно информации',
  wrong_category: 'Неправильная категория',
  salary_mismatch: 'Некорректные данные о зарплате',
  contact_info: 'Контактные данные в запрещённых полях',
  other: 'Другое',
}

export function getRejectionReasonLabel(reason?: string | null): string {
  if (reason && reason in REJECTION_REASON_LABELS) {
    return REJECTION_REASON_LABELS[reason as ModerationRejectionReason]
  }
  return 'См. комментарий модератора'
}
