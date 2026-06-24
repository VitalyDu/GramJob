import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/services/api'
import { CompanyStore } from './CompanyStore'

const mockCompany = {
  id: 1,
  documentId: 'abc123',
  name: 'Test Company',
  slug: 'test-company',
  country: 'RU',
  city: 'Москва',
  companySize: 'size_1_10' as const,
  status: 'draft' as const,
  logo: null,
  cover: null,
  owner: null,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockCompany],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('CompanyStore', () => {
  let store: CompanyStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new CompanyStore()
  })

  it('начинает с пустым состоянием', () => {
    expect(store.companies).toEqual([])
    expect(store.myCompanies).toEqual([])
    expect(store.currentCompany).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
  })

  describe('fetchCompanies', () => {
    it('заполняет companies и meta из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)

      await store.fetchCompanies()

      expect(store.companies).toEqual([mockCompany])
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('передаёт параметры search и country в URL', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })

      await store.fetchCompanies({ search: 'tech', country: 'RU' })

      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('search=tech')
      expect(url).toContain('country=RU')
    })

    it('устанавливает error при сетевой ошибке', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await store.fetchCompanies()

      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
      expect(store.companies).toEqual([])
    })
  })

  describe('fetchMyCompanies', () => {
    it('заполняет myCompanies из /companies/my', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)

      await store.fetchMyCompanies()

      expect(store.myCompanies).toEqual([mockCompany])
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('/companies/my')
    })
  })

  describe('fetchCompanyById', () => {
    it('устанавливает currentCompany из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockCompany })

      await store.fetchCompanyById('abc123')

      expect(store.currentCompany).toEqual(mockCompany)
      expect(store.isLoading).toBe(false)
    })

    it('сбрасывает currentCompany перед запросом', async () => {
      store.currentCompany = mockCompany
      vi.mocked(api.get).mockResolvedValue({ data: mockCompany })

      const fetchPromise = store.fetchCompanyById('abc123')
      expect(store.currentCompany).toBeNull()
      await fetchPromise
    })
  })

  describe('createCompany', () => {
    it('добавляет компанию в начало myCompanies и возвращает её', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockCompany })

      const result = await store.createCompany({
        name: 'Test Company',
        description: 'A test company',
        country: 'RU',
        companySize: 'size_1_10',
      })

      expect(store.myCompanies[0]).toEqual(mockCompany)
      expect(result).toEqual(mockCompany)
    })

    it('выбрасывает ошибку и устанавливает error', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Validation error'))

      await expect(
        store.createCompany({ name: '', description: '', country: 'RU', companySize: 'size_1_10' })
      ).rejects.toThrow('Validation error')

      expect(store.error).toBe('Validation error')
    })
  })

  describe('updateCompany', () => {
    it('обновляет компанию в myCompanies по documentId', async () => {
      store.myCompanies = [mockCompany]
      const updated = { ...mockCompany, name: 'Updated Name' }
      vi.mocked(api.put).mockResolvedValue({ data: updated })

      await store.updateCompany('abc123', { name: 'Updated Name' })

      expect(store.myCompanies[0]?.name).toBe('Updated Name')
    })

    it('обновляет currentCompany если его documentId совпадает', async () => {
      store.currentCompany = mockCompany
      const updated = { ...mockCompany, name: 'Updated' }
      vi.mocked(api.put).mockResolvedValue({ data: updated })

      await store.updateCompany('abc123', { name: 'Updated' })

      expect(store.currentCompany?.name).toBe('Updated')
    })
  })

  describe('deleteCompany', () => {
    it('удаляет компанию из myCompanies по documentId', async () => {
      store.myCompanies = [mockCompany]
      vi.mocked(api.delete).mockResolvedValue(undefined)

      await store.deleteCompany('abc123')

      expect(store.myCompanies).toEqual([])
    })

    it('выбрасывает ошибку при неудаче', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Cannot delete'))

      await expect(store.deleteCompany('abc123')).rejects.toThrow('Cannot delete')
      expect(store.error).toBe('Cannot delete')
    })
  })

  describe('submitCompany', () => {
    it('обновляет статус компании в myCompanies на moderation', async () => {
      store.myCompanies = [mockCompany]
      const submitted = { ...mockCompany, status: 'moderation' as const }
      vi.mocked(api.post).mockResolvedValue({ data: submitted })

      await store.submitCompany('abc123')

      expect(store.myCompanies[0]?.status).toBe('moderation')
    })

    it('вызывает POST /companies/abc123/submit', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockCompany })

      await store.submitCompany('abc123')

      expect(api.post).toHaveBeenCalledWith('/companies/abc123/submit', {})
    })
  })

  it('pageCount вычисляется как ceil(total / pageSize)', () => {
    store.total = 45
    store.pageSize = 20

    expect(store.pageCount).toBe(3)
  })
})
