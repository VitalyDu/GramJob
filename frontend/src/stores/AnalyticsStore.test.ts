import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/services/api'
import { AnalyticsStore } from './AnalyticsStore'

const mockVacancyAnalytics = {
  total: { views: 120, uniqueViews: 80, applications: 5, ctr: 6.2 },
  daily: [
    { date: '2026-06-30', views: 50, uniqueViews: 30, applications: 2, ctr: 6.7 },
    { date: '2026-07-01', views: 70, uniqueViews: 50, applications: 3, ctr: 6.0 },
  ],
}

const mockResumeAnalytics = {
  total: { views: 40, uniqueViews: 30, invitations: 2 },
  daily: [
    { date: '2026-06-30', views: 15, uniqueViews: 10, invitations: 1 },
    { date: '2026-07-01', views: 25, uniqueViews: 20, invitations: 1 },
  ],
}

describe('AnalyticsStore', () => {
  let store: AnalyticsStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new AnalyticsStore()
  })

  it('начальное состояние', () => {
    expect(store.vacancyAnalytics).toBeNull()
    expect(store.resumeAnalytics).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchVacancyAnalytics — успех, заполняет данные', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockVacancyAnalytics)
    await store.fetchVacancyAnalytics('doc123')
    expect(store.vacancyAnalytics).toEqual(mockVacancyAnalytics)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchVacancyAnalytics — строит URL с documentId', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockVacancyAnalytics)
    await store.fetchVacancyAnalytics('doc123')
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('/analytics/vacancies/doc123')
  })

  it('fetchVacancyAnalytics — добавляет from/to в URL', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockVacancyAnalytics)
    await store.fetchVacancyAnalytics('doc123', '2026-06-01', '2026-06-30')
    const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
    expect(url).toContain('from=2026-06-01')
    expect(url).toContain('to=2026-06-30')
  })

  it('fetchVacancyAnalytics — ошибка, устанавливает error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Forbidden'))
    await store.fetchVacancyAnalytics('doc999')
    expect(store.error).toBe('Forbidden')
    expect(store.vacancyAnalytics).toBeNull()
  })

  it('fetchResumeAnalytics — успех, заполняет данные', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResumeAnalytics)
    await store.fetchResumeAnalytics('res456')
    expect(store.resumeAnalytics).toEqual(mockResumeAnalytics)
    expect(store.isLoading).toBe(false)
  })

  it('fetchResumeAnalytics — строит URL с documentId', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResumeAnalytics)
    await store.fetchResumeAnalytics('res456')
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('/analytics/resumes/res456')
  })

  it('fetchResumeAnalytics — ошибка, устанавливает error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Not found'))
    await store.fetchResumeAnalytics('res999')
    expect(store.error).toBe('Not found')
    expect(store.resumeAnalytics).toBeNull()
  })
})
