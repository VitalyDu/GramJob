import { describe, expect, it } from 'vitest'
import { parseVacancySearchParams } from './search-params'

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
