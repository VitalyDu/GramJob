import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchVacancyServer,
  fetchCompanyServer,
  fetchVacanciesPageServer,
  fetchCompaniesPageServer,
} from './server-api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) }
}

describe('server-api', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('fetchVacancyServer returns vacancy data with skipViewCount', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: { documentId: 'v1', title: 'Dev' } }))
    const result = await fetchVacancyServer('v1')
    expect(result).toEqual({
      data: {
        documentId: 'v1',
        title: 'Dev',
        workFormat: [],
        employmentType: [],
        seniority: [],
      },
      notFound: false,
    })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/vacancies/v1?skipViewCount=true'),
      { next: { revalidate: 300 } }
    )
  })

  it('fetchVacancyServer marks notFound on 404 response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 })
    expect(await fetchVacancyServer('missing')).toEqual({ data: null, notFound: true })
  })

  it('fetchVacancyServer does not mark notFound when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    expect(await fetchVacancyServer('v1')).toEqual({ data: null, notFound: false })
  })

  it('fetchCompanyServer returns company data', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: { documentId: 'c1', name: 'Acme' } }))
    const result = await fetchCompanyServer('c1')
    expect(result).toEqual({ data: { documentId: 'c1', name: 'Acme' }, notFound: false })
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/companies/c1'), {
      next: { revalidate: 300 },
    })
  })

  it('fetchVacanciesPageServer returns items and total', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: [{ documentId: 'v1' }], meta: { total: 42 } }))
    const result = await fetchVacanciesPageServer(1, 20)
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(42)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/vacancies?page=1&pageSize=20'),
      { next: { revalidate: 3600 } }
    )
  })

  it('fetchVacanciesPageServer returns empty page on error', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    expect(await fetchVacanciesPageServer(1, 20)).toEqual({ items: [], total: 0 })
  })

  it('fetchCompaniesPageServer returns items and total', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: [{ documentId: 'c1' }], meta: { total: 7 } }))
    const result = await fetchCompaniesPageServer(2, 100)
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(7)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/companies?page=2&pageSize=100'),
      { next: { revalidate: 3600 } }
    )
  })
})
