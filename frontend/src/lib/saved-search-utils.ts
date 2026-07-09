import type { SavedSearchFilters, VacancyListParams } from '@/types/api'

export function filtersToQueryString(filters: SavedSearchFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' || value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== '') params.append(key, String(item))
      }
    } else {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

export function paramsToSavedFilters(params: object): SavedSearchFilters {
  const filters: SavedSearchFilters = {}
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page' || value === undefined || value === null) continue
    filters[key] = value as SavedSearchFilters[string]
  }
  return filters
}

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
    // Разбивка по запятой — совместимость со старыми сохранёнными поисками
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
