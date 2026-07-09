import { describe, expect, it } from 'vitest'
import {
  filtersToQueryString,
  paramsToSavedFilters,
  parseVacancySearchParams,
} from './saved-search-utils'

describe('filtersToQueryString', () => {
  it('сериализует массивы повторением ключа', () => {
    const qs = filtersToQueryString({ workFormat: ['office', 'remote'], country: 'RU' })
    expect(qs).toBe('workFormat=office&workFormat=remote&country=RU')
  })

  it('пропускает page, undefined, пустые строки и пустые массивы', () => {
    const qs = filtersToQueryString({
      page: 3,
      search: '',
      seniority: [],
      country: undefined,
      workFormat: ['remote'],
    })
    expect(qs).toBe('workFormat=remote')
  })

  it('сериализует числа и булевы значения', () => {
    const qs = filtersToQueryString({ salaryFrom: 1000, urgent: true })
    expect(qs).toBe('salaryFrom=1000&urgent=true')
  })
})

describe('paramsToSavedFilters', () => {
  it('исключает page и undefined-значения', () => {
    expect(
      paramsToSavedFilters({
        search: 'react',
        page: 5,
        workFormat: ['office', 'remote'],
        country: undefined,
      })
    ).toEqual({ search: 'react', workFormat: ['office', 'remote'] })
  })
})

describe('parseVacancySearchParams', () => {
  it('читает multi-select фильтры из повторённых ключей', () => {
    const sp = new URLSearchParams('workFormat=office&workFormat=remote&search=react')
    expect(parseVacancySearchParams(sp)).toEqual({
      page: 1,
      search: 'react',
      workFormat: ['office', 'remote'],
    })
  })

  it('разбивает legacy comma-separated значения', () => {
    const sp = new URLSearchParams('workFormat=office,remote&seniority=senior')
    expect(parseVacancySearchParams(sp)).toEqual({
      page: 1,
      workFormat: ['office', 'remote'],
      seniority: ['senior'],
    })
  })

  it('парсит скаляры и числа', () => {
    const sp = new URLSearchParams(
      'search=go&country=RU&industry=abc&specialization=def&salaryFrom=1000&sort=newest'
    )
    expect(parseVacancySearchParams(sp)).toEqual({
      page: 1,
      search: 'go',
      country: 'RU',
      industry: 'abc',
      specialization: 'def',
      salaryFrom: 1000,
      sort: 'newest',
    })
  })

  it('возвращает {page: 1} для пустой строки запроса', () => {
    expect(parseVacancySearchParams(new URLSearchParams())).toEqual({ page: 1 })
  })
})
