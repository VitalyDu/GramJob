import type { VacancyListParams } from '@/types/api'

const VACANCY_MULTI_KEYS = ['workFormat', 'employmentType', 'seniority'] as const
const VACANCY_STRING_KEYS = [
  'search',
  'industry',
  'specialization',
  'country',
  'city',
  'salaryCurrency',
  'sort',
] as const
const VACANCY_NUMBER_KEYS = ['salaryFrom', 'salaryTo'] as const

export function parseVacancySearchParams(sp: URLSearchParams): VacancyListParams {
  const params: Record<string, unknown> = { page: 1 }

  for (const key of VACANCY_MULTI_KEYS) {
    const values = sp
      .getAll(key)
      .flatMap((v) => v.split(','))
      .filter(Boolean)
    if (values.length > 0) params[key] = values
  }

  for (const key of VACANCY_STRING_KEYS) {
    const value = sp.get(key)
    if (value) params[key] = value
  }

  for (const key of VACANCY_NUMBER_KEYS) {
    const value = Number(sp.get(key))
    if (sp.get(key) && Number.isFinite(value)) params[key] = value
  }

  return params as VacancyListParams
}
