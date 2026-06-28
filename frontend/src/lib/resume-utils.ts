import type { ResumeStatusEnum, ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'

export const RESUME_WORK_FORMAT_LABELS: Record<ResumeWorkFormatEnum, string> = {
  office: 'Офис',
  remote: 'Удалённо',
  hybrid: 'Гибрид',
  any: 'Любой',
}

export const RESUME_EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeEnum, string> = {
  'full-time': 'Полная занятость',
  'part-time': 'Частичная занятость',
  contract: 'Контракт',
  internship: 'Стажировка',
  freelance: 'Фриланс',
}

export const APPLY_PLAN_LIMITS: Record<string, number> = {
  free: 3,
  pro: 10,
  max: 50,
  vip: 50,
}

export function canPublishResume(status: ResumeStatusEnum): boolean {
  return status === 'draft' || status === 'rejected'
}

export function canEditResume(status: ResumeStatusEnum): boolean {
  return status === 'draft' || status === 'rejected' || status === 'published'
}

export function canArchiveResume(status: ResumeStatusEnum): boolean {
  return status === 'published' || status === 'draft' || status === 'rejected'
}
