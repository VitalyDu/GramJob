import i18next from '@/lib/i18n'
import type {
  VacancyStatusEnum,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
  SalaryCurrencyEnum,
} from '@/types/api'

export const WORK_FORMAT_LABELS: Record<WorkFormatEnum, string> = {
  office: 'Офис',
  remote: 'Удалённо',
  hybrid: 'Гибрид',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeEnum, string> = {
  'full-time': 'Полная занятость',
  'part-time': 'Частичная занятость',
  contract: 'Контракт',
  internship: 'Стажировка',
  freelance: 'Фриланс',
}

export const SENIORITY_LABELS: Record<SeniorityEnum, string> = {
  intern: 'Intern',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
  principal: 'Principal',
}

export const WORK_FORMAT_VALUES = [
  'remote',
  'office',
  'hybrid',
] as const satisfies readonly WorkFormatEnum[]
export const EMPLOYMENT_TYPE_VALUES = [
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
] as const satisfies readonly EmploymentTypeEnum[]
export const SENIORITY_VALUES = [
  'intern',
  'junior',
  'middle',
  'senior',
  'lead',
  'principal',
] as const satisfies readonly SeniorityEnum[]

export const SALARY_CURRENCY_SYMBOLS: Record<SalaryCurrencyEnum, string> = {
  USD: '$',
  EUR: '€',
  RUB: '₽',
  GBP: '£',
}

export function canPublishVacancy(status: VacancyStatusEnum): boolean {
  return status === 'draft' || status === 'rejected' || status === 'expired'
}

export function canBoostVacancy(status: VacancyStatusEnum): boolean {
  return status === 'published'
}

export function canArchiveVacancy(status: VacancyStatusEnum): boolean {
  return status !== 'archived' && status !== 'moderation'
}

export function canEditVacancy(status: VacancyStatusEnum): boolean {
  return status === 'draft' || status === 'rejected' || status === 'published'
}

export function canDeleteVacancy(status: VacancyStatusEnum): boolean {
  return status === 'draft' || status === 'rejected'
}

export function formatSalary(
  from?: number | null,
  to?: number | null,
  currency?: SalaryCurrencyEnum | null
): string {
  if (!from && !to) return ''
  const sym = currency ? (SALARY_CURRENCY_SYMBOLS[currency] ?? '') : ''
  const locale = i18next.language === 'ru' ? 'ru' : 'en'
  const fmt = (n: number) => (sym ? `${n.toLocaleString(locale)} ${sym}` : n.toLocaleString(locale))
  if (from && to) return `${fmt(from)} — ${fmt(to)}`
  if (from) return `${i18next.t('salary.from')} ${fmt(from)}`
  return `${i18next.t('salary.to')} ${fmt(to!)}`
}
