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
import { VacancyStore } from './VacancyStore'

const mockVacancy = {
  id: 1,
  documentId: 'vac123',
  title: 'Senior Frontend Developer',
  country: 'RU',
  city: 'Москва',
  workFormat: 'remote' as const,
  employmentType: 'full-time' as const,
  seniority: 'senior' as const,
  sourceType: 'internal' as const,
  highlighted: false,
  urgent: false,
  topPlacement: false,
  status: 'draft' as const,
  createdAt: '2026-01-01T00:00:00Z',
  industry: { documentId: 'ind1', slug: 'it', name: { ru: 'IT', en: 'IT' } },
  specialization: {
    documentId: 'spec1',
    slug: 'frontend',
    name: { ru: 'Фронтенд', en: 'Frontend' },
  },
  company: { documentId: 'comp1', name: 'Test Company', slug: 'test-company', logo: null },
}

const mockListResponse = {
  data: [mockVacancy],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('VacancyStore', () => {
  let store: VacancyStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new VacancyStore()
  })

  it('начинает с пустым состоянием', () => {
    expect(store.vacancies).toEqual([])
    expect(store.myVacancies).toEqual([])
    expect(store.currentVacancy).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
    expect(store.limitReached).toBe(false)
  })

  describe('fetchVacancies', () => {
    it('заполняет vacancies и meta из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)

      await store.fetchVacancies()

      expect(store.vacancies).toEqual([mockVacancy])
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('передаёт параметры фильтрации в URL', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })

      await store.fetchVacancies({ search: 'react', country: 'RU', workFormat: ['remote'] })

      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('search=react')
      expect(url).toContain('country=RU')
      expect(url).toContain('workFormat=remote')
    })

    it('устанавливает error при сетевой ошибке', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await store.fetchVacancies()

      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
      expect(store.vacancies).toEqual([])
    })
  })

  describe('fetchMyVacancies', () => {
    it('заполняет myVacancies из /vacancies/my', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)

      await store.fetchMyVacancies()

      expect(store.myVacancies).toEqual([mockVacancy])
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('/vacancies/my')
    })
  })

  describe('fetchVacancyById', () => {
    it('устанавливает currentVacancy из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockVacancy })

      await store.fetchVacancyById('vac123')

      expect(store.currentVacancy).toEqual(mockVacancy)
      expect(store.isLoading).toBe(false)
    })

    it('сбрасывает currentVacancy перед запросом', async () => {
      store.currentVacancy = mockVacancy
      vi.mocked(api.get).mockResolvedValue({ data: mockVacancy })

      const fetchPromise = store.fetchVacancyById('vac123')
      expect(store.currentVacancy).toBeNull()
      await fetchPromise
    })
  })

  describe('createVacancy', () => {
    it('добавляет вакансию в начало myVacancies и возвращает её', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockVacancy })

      const result = await store.createVacancy({
        title: 'Senior Frontend Developer',
        industryId: 'ind1',
        specializationId: 'spec1',
        employmentType: 'full-time',
        workFormat: 'remote',
        seniority: 'senior',
        country: 'RU',
        description: 'Description',
        responsibilities: 'Responsibilities',
        requirements: 'Requirements',
      })

      expect(store.myVacancies[0]).toEqual(mockVacancy)
      expect(result).toEqual(mockVacancy)
    })

    it('выбрасывает ошибку и устанавливает error', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Validation error'))

      await expect(
        store.createVacancy({
          title: '',
          industryId: 'ind1',
          specializationId: 'spec1',
          employmentType: 'full-time',
          workFormat: 'remote',
          seniority: 'senior',
          country: 'RU',
          description: '',
          responsibilities: '',
          requirements: '',
        })
      ).rejects.toThrow('Validation error')

      expect(store.error).toBe('Validation error')
    })

    it('ставит limitReached=true при 403 LIMIT_REACHED и возвращает null', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(403, { error: { code: 'LIMIT_REACHED' } }, 'Vacancy limit reached')
      )

      const result = await store.createVacancy({
        title: 'Senior Frontend Developer',
        industryId: 'ind1',
        specializationId: 'spec1',
        employmentType: 'full-time',
        workFormat: 'remote',
        seniority: 'senior',
        country: 'RU',
        description: 'Description',
        responsibilities: 'Responsibilities',
        requirements: 'Requirements',
      })

      expect(result).toBeNull()
      expect(store.limitReached).toBe(true)
      expect(store.error).toBeNull()
    })
  })

  describe('updateVacancy', () => {
    it('обновляет вакансию в myVacancies по documentId', async () => {
      store.myVacancies = [mockVacancy]
      const updated = { ...mockVacancy, title: 'Updated Title' }
      vi.mocked(api.put).mockResolvedValue({ data: updated })

      await store.updateVacancy('vac123', { title: 'Updated Title' })

      expect(store.myVacancies[0]?.title).toBe('Updated Title')
    })

    it('обновляет currentVacancy если documentId совпадает', async () => {
      store.currentVacancy = mockVacancy
      const updated = { ...mockVacancy, title: 'Updated' }
      vi.mocked(api.put).mockResolvedValue({ data: updated })

      await store.updateVacancy('vac123', { title: 'Updated' })

      expect(store.currentVacancy?.title).toBe('Updated')
    })

    it('ставит limitReached=true при 403 LIMIT_REACHED и возвращает null', async () => {
      vi.mocked(api.put).mockRejectedValue(
        new ApiClientError(403, { error: { code: 'LIMIT_REACHED' } }, 'Vacancy limit reached')
      )

      const result = await store.updateVacancy('vac123', { title: 'Updated Title' })

      expect(result).toBeNull()
      expect(store.limitReached).toBe(true)
      expect(store.error).toBeNull()
    })
  })

  describe('deleteVacancy', () => {
    it('удаляет вакансию из myVacancies по documentId', async () => {
      store.myVacancies = [mockVacancy]
      vi.mocked(api.delete).mockResolvedValue(undefined)

      await store.deleteVacancy('vac123')

      expect(store.myVacancies).toEqual([])
    })

    it('выбрасывает ошибку при неудаче', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Cannot delete'))

      await expect(store.deleteVacancy('vac123')).rejects.toThrow('Cannot delete')
      expect(store.error).toBe('Cannot delete')
    })
  })

  describe('publishVacancy', () => {
    it('вызывает POST /vacancies/:id/publish и обновляет статус в myVacancies', async () => {
      store.myVacancies = [mockVacancy]
      const published = { ...mockVacancy, status: 'moderation' as const }
      vi.mocked(api.post).mockResolvedValue({ data: published })

      await store.publishVacancy('vac123')

      expect(api.post).toHaveBeenCalledWith('/vacancies/vac123/publish', {})
      expect(store.myVacancies[0]?.status).toBe('moderation')
    })

    it('устанавливает limitReached=true при ошибке LIMIT_REACHED и не выбрасывает', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(402, { error: { code: 'LIMIT_REACHED' } }, 'Credit limit reached')
      )

      await expect(store.publishVacancy('vac123')).resolves.toBeUndefined()

      expect(store.limitReached).toBe(true)
      expect(store.error).toBeNull()
    })
  })

  describe('archiveVacancy', () => {
    it('вызывает POST /vacancies/:id/archive и обновляет статус в myVacancies', async () => {
      store.myVacancies = [mockVacancy]
      const archived = { ...mockVacancy, status: 'archived' as const }
      vi.mocked(api.post).mockResolvedValue({ data: archived })

      await store.archiveVacancy('vac123')

      expect(api.post).toHaveBeenCalledWith('/vacancies/vac123/archive', {})
      expect(store.myVacancies[0]?.status).toBe('archived')
    })
  })
})
