const VALID_SAVED_SEARCH_TYPES = ['vacancy', 'resume'] as const
export type SavedSearchType = (typeof VALID_SAVED_SEARCH_TYPES)[number]

export function isValidSavedSearchType(type: string): type is SavedSearchType {
  return (VALID_SAVED_SEARCH_TYPES as readonly string[]).includes(type)
}

export function buildVacancyFiltersFromSaved(
  saved: Record<string, unknown>
): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    status: { $eq: 'published' },
    expiresAt: { $gt: new Date().toISOString() },
  }

  if (saved.industry) {
    filters.industry = { documentId: { $eq: saved.industry } }
  }

  if (saved.specialization) {
    filters.specialization = { documentId: { $eq: saved.specialization } }
  }

  if (saved.country) {
    filters.country = { $eq: saved.country }
  }

  if (saved.workFormat) {
    filters.workFormat = { $eq: saved.workFormat }
  }

  if (saved.employmentType) {
    filters.employmentType = { $eq: saved.employmentType }
  }

  if (saved.seniority) {
    filters.seniority = { $eq: saved.seniority }
  }

  return filters
}

export function buildResumeFiltersFromSaved(
  saved: Record<string, unknown>
): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    status: { $eq: 'published' },
  }

  if (saved.country) {
    filters.country = { $eq: saved.country }
  }

  if (saved.workFormat) {
    filters.workFormat = { $eq: saved.workFormat }
  }

  if (saved.employmentType) {
    filters.employmentType = { $eq: saved.employmentType }
  }

  if (saved.experienceYears) {
    filters.experienceYears = { $lte: saved.experienceYears }
  }

  return filters
}
