import {
  isValidSavedSearchType,
  buildVacancyFiltersFromSaved,
  buildResumeFiltersFromSaved,
} from '../../src/api/saved-search/services/saved-search-utils'

describe('isValidSavedSearchType', () => {
  it('returns true for vacancy', () => {
    expect(isValidSavedSearchType('vacancy')).toBe(true)
  })

  it('returns true for resume', () => {
    expect(isValidSavedSearchType('resume')).toBe(true)
  })

  it('returns false for unknown', () => {
    expect(isValidSavedSearchType('company')).toBe(false)
  })
})

describe('buildVacancyFiltersFromSaved', () => {
  it('always includes status=published filter', () => {
    const filters = buildVacancyFiltersFromSaved({})
    expect(filters.status).toEqual({ $eq: 'published' })
  })

  it('always includes non-expired filter', () => {
    const filters = buildVacancyFiltersFromSaved({})
    expect(filters.expiresAt).toBeDefined()
  })

  it('maps industry to Strapi relation filter', () => {
    const filters = buildVacancyFiltersFromSaved({ industry: 'abc123' })
    expect(filters.industry).toEqual({ documentId: { $eq: 'abc123' } })
  })

  it('maps country to equality filter', () => {
    const filters = buildVacancyFiltersFromSaved({ country: 'RU' })
    expect(filters.country).toEqual({ $eq: 'RU' })
  })

  it('maps workFormat to equality filter', () => {
    const filters = buildVacancyFiltersFromSaved({ workFormat: 'remote' })
    expect(filters.workFormat).toEqual({ $eq: 'remote' })
  })

  it('maps employmentType to equality filter', () => {
    const filters = buildVacancyFiltersFromSaved({ employmentType: 'full-time' })
    expect(filters.employmentType).toEqual({ $eq: 'full-time' })
  })

  it('maps seniority to equality filter', () => {
    const filters = buildVacancyFiltersFromSaved({ seniority: 'senior' })
    expect(filters.seniority).toEqual({ $eq: 'senior' })
  })

  it('ignores unknown filter keys', () => {
    const filters = buildVacancyFiltersFromSaved({ unknown: 'value' })
    expect(Object.keys(filters)).not.toContain('unknown')
  })
})

describe('buildResumeFiltersFromSaved', () => {
  it('always includes status=published filter', () => {
    const filters = buildResumeFiltersFromSaved({})
    expect(filters.status).toEqual({ $eq: 'published' })
  })

  it('maps country to equality filter', () => {
    const filters = buildResumeFiltersFromSaved({ country: 'RU' })
    expect(filters.country).toEqual({ $eq: 'RU' })
  })

  it('maps workFormat to equality filter', () => {
    const filters = buildResumeFiltersFromSaved({ workFormat: 'remote' })
    expect(filters.workFormat).toEqual({ $eq: 'remote' })
  })
})
