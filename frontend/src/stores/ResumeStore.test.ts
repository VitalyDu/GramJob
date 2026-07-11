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
      put: vi.fn(),
      delete: vi.fn(),
    },
    ApiClientError,
  }
})

import { api, ApiClientError } from '@/services/api'
import type { ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'
import { ResumeStore } from './ResumeStore'

const mockResume = {
  id: 1,
  documentId: 'res123',
  title: 'Senior Frontend Developer',
  firstName: 'Иван',
  lastName: 'Иванов',
  country: 'RU',
  workFormat: ['remote'] as ResumeWorkFormatEnum[],
  employmentType: ['full-time'] as EmploymentTypeEnum[],
  moderationStatus: 'draft' as const,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockResume],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('ResumeStore', () => {
  let store: ResumeStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ResumeStore()
  })

  it('начинает с пустым состоянием', () => {
    expect(store.resumes).toEqual([])
    expect(store.myResumes).toEqual([])
    expect(store.currentResume).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
    expect(store.accessDenied).toBe(false)
  })

  describe('fetchResumes', () => {
    it('заполняет resumes и meta из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchResumes()
      expect(store.resumes).toEqual([mockResume])
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('устанавливает accessDenied при 403', async () => {
      vi.mocked(api.get).mockRejectedValue(new ApiClientError(403, {}, 'Forbidden'))
      await store.fetchResumes()
      expect(store.accessDenied).toBe(true)
      expect(store.error).toBeNull()
    })

    it('устанавливает error при других ошибках', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchResumes()
      expect(store.error).toBe('Network error')
      expect(store.accessDenied).toBe(false)
    })

    it('передаёт query-параметры в URL', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchResumes({ country: 'RU', page: 2 })
      expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('country=RU')
      expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('page=2')
    })
  })

  describe('fetchMyResumes', () => {
    it('заполняет myResumes', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchMyResumes()
      expect(store.myResumes).toEqual([mockResume])
      expect(store.page).toBe(1)
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('fail'))
      await store.fetchMyResumes()
      expect(store.error).toBe('fail')
    })
  })

  describe('fetchResumeById', () => {
    it('заполняет currentResume', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockResume })
      await store.fetchResumeById('res123')
      expect(store.currentResume).toEqual(mockResume)
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('not found'))
      await store.fetchResumeById('res123')
      expect(store.error).toBe('not found')
      expect(store.currentResume).toBeNull()
    })
  })

  describe('createResume', () => {
    it('добавляет новое резюме в начало myResumes', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockResume })
      const result = await store.createResume({
        title: 'Senior Frontend Developer',
        firstName: 'Иван',
        lastName: 'Иванов',
        country: 'RU',
        workFormat: ['remote'],
        employmentType: ['full-time'],
      })
      expect(result).toEqual(mockResume)
      expect(store.myResumes[0]).toEqual(mockResume)
    })

    it('выбрасывает и устанавливает error при сбое', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Bad request'))
      await expect(
        store.createResume({
          title: 'Test',
          firstName: 'А',
          lastName: 'Б',
          country: 'RU',
          workFormat: ['remote'],
          employmentType: ['full-time'],
        })
      ).rejects.toThrow('Bad request')
      expect(store.error).toBe('Bad request')
    })
  })

  describe('updateResume', () => {
    it('обновляет резюме в myResumes и currentResume', async () => {
      const updated = { ...mockResume, title: 'Updated Title' }
      store.myResumes = [mockResume]
      store.currentResume = mockResume
      vi.mocked(api.put).mockResolvedValue({ data: updated })
      await store.updateResume('res123', { title: 'Updated Title' })
      expect(store.myResumes[0]?.title).toBe('Updated Title')
      expect(store.currentResume?.title).toBe('Updated Title')
    })
  })

  describe('publishResume', () => {
    it('обновляет резюме в myResumes после публикации', async () => {
      const published = { ...mockResume, moderationStatus: 'moderation' as const }
      store.myResumes = [mockResume]
      vi.mocked(api.post).mockResolvedValue({ data: published })
      await store.publishResume('res123')
      expect(store.myResumes[0]?.moderationStatus).toBe('moderation')
    })
  })

  describe('archiveResume', () => {
    it('обновляет резюме в myResumes после архивации', async () => {
      const archived = { ...mockResume, moderationStatus: 'archived' as const }
      store.myResumes = [mockResume]
      vi.mocked(api.delete).mockResolvedValue({ data: archived })
      await store.archiveResume('res123')
      expect(store.myResumes[0]?.moderationStatus).toBe('archived')
    })
  })

  describe('clearAccessDenied', () => {
    it('сбрасывает accessDenied', () => {
      store.accessDenied = true
      store.clearAccessDenied()
      expect(store.accessDenied).toBe(false)
    })
  })

  describe('pageCount', () => {
    it('вычисляет pageCount из total и pageSize', () => {
      store.total = 45
      store.pageSize = 20
      expect(store.pageCount).toBe(3)
    })
  })
})
