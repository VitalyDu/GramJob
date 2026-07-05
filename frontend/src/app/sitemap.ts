import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { fetchVacanciesPageServer, fetchCompaniesPageServer, type ListPage } from '@/lib/server-api'

export const revalidate = 3600

const PAGE_SIZE = 100
const MAX_PAGES = 10

async function collectAll<T extends { documentId: string; createdAt: string }>(
  fetchPage: (page: number, pageSize: number) => Promise<ListPage<T>>
): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, total } = await fetchPage(page, PAGE_SIZE)
    out.push(...items)
    if (items.length === 0 || out.length >= total) break
  }
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vacancies, companies] = await Promise.all([
    collectAll(fetchVacanciesPageServer),
    collectAll(fetchCompaniesPageServer),
  ])

  return [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/vacancies`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/companies`, changeFrequency: 'daily', priority: 0.7 },
    ...vacancies.map((v) => ({
      url: `${SITE_URL}/vacancies/${v.documentId}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
      lastModified: v.createdAt,
    })),
    ...companies.map((c) => ({
      url: `${SITE_URL}/companies/${c.documentId}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
      lastModified: c.createdAt,
    })),
  ]
}
