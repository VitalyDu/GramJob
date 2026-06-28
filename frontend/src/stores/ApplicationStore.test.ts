import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => {
  class ApiClientError extends Error {
    constructor(
      public status: number,
      public data: unknown,
      message: string
    ) {
      super(message)
      this.name = 'ApiClientError'
    }
  }
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
    ApiClientError,
  }
})

import { api, ApiClientError } from '@/services/api'
import { ApplicationStore } from './ApplicationStore'

const mockVacancyRef = {
  documentId: 'vac123',
  title: 'Senior Developer',
  status: 'published' as const,
  sourceType: 'internal' as const,
  company: { documentId: 'comp1', name: 'Test Co', slug: 'test-co' },
}

const mockResumeRef = {
  documentId: 'res123',
  title: 'My Resume',
  firstName: 'Иван',
  lastName: 'Иванов',
  status: 'published' as const,
}

const mockUserRef = { id: 1, firstName: 'Иван', lastName: 'Иванов' }

const mockApplication = {
  id: 1,
  documentId: 'app123',
  vacancy: mockVacancyRef,
  resume: mockResumeRef,
  user: mockUserRef,
  status: 'applied' as const,
  coverLetter: null,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockApplication],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('ApplicationStore', () => {
  let store: ApplicationStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ApplicationStore()
  })

  it('начинает с пустым состоянием', () => {
    expect(store.applications).toEqual([])
    expect(store.vacancyApplications).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
    expect(store.vacancyTotal).toBe(0)
    expect(store.limitReached).toBe(false)
    expect(store.alreadyApplied).toBe(false)
  })

  describe('createApplication', () => {
    it('добавляет отклик в начало applications', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockApplication })
      const result = await store.createApplication({
        vacancyId: 'vac123',
        resumeId: 'res123',
        coverLetter: 'Привет!',
      })
      expect(result).toEqual(mockApplication)
      expect(store.applications[0]).toEqual(mockApplication)
    })

    it('устанавливает limitReached при 403 LIMIT_REACHED', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(403, { error: { code: 'LIMIT_REACHED' } }, 'Limit reached')
      )
      await expect(
        store.createApplication({ vacancyId: 'vac123', resumeId: 'res123' })
      ).rejects.toThrow()
      expect(store.limitReached).toBe(true)
      expect(store.alreadyApplied).toBe(false)
    })

    it('устанавливает alreadyApplied при 409 ALREADY_APPLIED', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(409, { error: { code: 'ALREADY_APPLIED' } }, 'Already applied')
      )
      await expect(
        store.createApplication({ vacancyId: 'vac123', resumeId: 'res123' })
      ).rejects.toThrow()
      expect(store.alreadyApplied).toBe(true)
      expect(store.limitReached).toBe(false)
    })

    it('устанавливает error при других ошибках', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'))
      await expect(
        store.createApplication({ vacancyId: 'vac123', resumeId: 'res123' })
      ).rejects.toThrow()
      expect(store.error).toBe('Network error')
    })
  })

  describe('fetchMyApplications', () => {
    it('заполняет applications из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchMyApplications()
      expect(store.applications).toEqual([mockApplication])
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('fail'))
      await store.fetchMyApplications()
      expect(store.error).toBe('fail')
    })
  })

  describe('fetchVacancyApplications', () => {
    it('заполняет vacancyApplications из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchVacancyApplications('vac123')
      expect(store.vacancyApplications).toEqual([mockApplication])
      expect(store.vacancyTotal).toBe(1)
      expect(store.vacancyPage).toBe(1)
    })

    it('не перезаписывает total кандидата', async () => {
      store.total = 5
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchVacancyApplications('vac123')
      expect(store.total).toBe(5) // candidate total must be unchanged
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('fail'))
      await store.fetchVacancyApplications('vac123')
      expect(store.error).toBe('fail')
    })
  })

  describe('updateApplicationStatus', () => {
    it('обновляет статус в vacancyApplications', async () => {
      const updated = { ...mockApplication, status: 'viewed' as const }
      store.vacancyApplications = [mockApplication]
      vi.mocked(api.patch).mockResolvedValue({ data: updated })
      await store.updateApplicationStatus('app123', 'viewed')
      expect(store.vacancyApplications[0]?.status).toBe('viewed')
    })

    it('обновляет статус в applications (кандидат)', async () => {
      const updated = { ...mockApplication, status: 'viewed' as const }
      store.applications = [mockApplication]
      vi.mocked(api.patch).mockResolvedValue({ data: updated })
      await store.updateApplicationStatus('app123', 'viewed')
      expect(store.applications[0]?.status).toBe('viewed')
    })

    it('выбрасывает и устанавливает error при сбое', async () => {
      vi.mocked(api.patch).mockRejectedValue(new Error('Forbidden'))
      await expect(store.updateApplicationStatus('app123', 'viewed')).rejects.toThrow()
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('clearFlags', () => {
    it('сбрасывает limitReached и alreadyApplied', () => {
      store.limitReached = true
      store.alreadyApplied = true
      store.clearFlags()
      expect(store.limitReached).toBe(false)
      expect(store.alreadyApplied).toBe(false)
    })
  })

  describe('pageCount', () => {
    it('вычисляет pageCount из total и pageSize', () => {
      store.total = 45
      store.pageSize = 20
      expect(store.pageCount).toBe(3)
    })
  })

  describe('vacancyPageCount', () => {
    it('вычисляет vacancyPageCount из vacancyTotal и pageSize', () => {
      store.vacancyTotal = 45
      store.pageSize = 20
      expect(store.vacancyPageCount).toBe(3)
    })

    it('возвращает 0 если vacancyTotal равен 0', () => {
      expect(store.vacancyPageCount).toBe(0)
    })
  })
})
