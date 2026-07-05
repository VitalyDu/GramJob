import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/server-api', () => ({
  fetchVacanciesPageServer: vi.fn(),
  fetchCompaniesPageServer: vi.fn(),
}))

import sitemap from './sitemap'
import { fetchVacanciesPageServer, fetchCompaniesPageServer } from '@/lib/server-api'

describe('sitemap', () => {
  beforeEach(() => {
    vi.mocked(fetchVacanciesPageServer).mockResolvedValue({
      items: [{ documentId: 'vac1', createdAt: '2026-07-01T00:00:00Z' } as never],
      total: 1,
    })
    vi.mocked(fetchCompaniesPageServer).mockResolvedValue({
      items: [{ documentId: 'comp1', createdAt: '2026-06-01T00:00:00Z' } as never],
      total: 1,
    })
  })

  it('includes static routes, vacancies and companies', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://gramjob.com')
    expect(urls).toContain('https://gramjob.com/vacancies')
    expect(urls).toContain('https://gramjob.com/companies')
    expect(urls).toContain('https://gramjob.com/vacancies/vac1')
    expect(urls).toContain('https://gramjob.com/companies/comp1')
  })

  it('does not include resume routes', async () => {
    const entries = await sitemap()
    expect(entries.every((e) => !e.url.includes('/resumes'))).toBe(true)
  })
})
