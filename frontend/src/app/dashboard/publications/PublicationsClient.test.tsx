import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const vacancyStore = {
  myVacancies: [] as unknown[],
  isLoading: false,
  error: null as string | null,
  limitReached: false,
  fetchMyVacancies: vi.fn(),
  publishVacancy: vi.fn(),
  clearLimitReached: vi.fn(),
}
const resumeStore = {
  myResumes: [] as unknown[],
  isLoading: false,
  error: null as string | null,
  fetchMyResumes: vi.fn(),
  publishResume: vi.fn(),
}
const companyStore = {
  myCompanies: [] as unknown[],
  isLoading: false,
  error: null as string | null,
  fetchMyCompanies: vi.fn(),
  submitCompany: vi.fn(),
}

const limitsStore = {
  data: null,
  isLoading: false,
  error: null,
  fetchLimits: vi.fn(),
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    vacancy: vacancyStore,
    resume: resumeStore,
    company: companyStore,
    limits: limitsStore,
  }),
}))

vi.mock('@/hooks/useRequireAuth', () => ({ useRequireAuth: () => true }))

import { PublicationsClient } from './PublicationsClient'

describe('PublicationsClient', () => {
  beforeEach(() => {
    vacancyStore.myVacancies = []
    resumeStore.myResumes = []
    companyStore.myCompanies = []
    vacancyStore.fetchMyVacancies.mockClear()
    resumeStore.fetchMyResumes.mockClear()
    companyStore.fetchMyCompanies.mockClear()
  })

  it('загружает все три типа публикаций при монтировании', () => {
    render(<PublicationsClient />)
    expect(vacancyStore.fetchMyVacancies).toHaveBeenCalledOnce()
    expect(resumeStore.fetchMyResumes).toHaveBeenCalledOnce()
    expect(companyStore.fetchMyCompanies).toHaveBeenCalledOnce()
  })

  it('показывает пустое состояние, когда публикаций нет', () => {
    render(<PublicationsClient />)
    expect(screen.getByText(/У вас пока нет публикаций/)).toBeDefined()
  })

  it('отображает вакансию со статусом и названием', () => {
    vacancyStore.myVacancies = [
      { documentId: 'v1', title: 'Frontend Developer', moderationStatus: 'moderation' },
    ]
    render(<PublicationsClient />)
    expect(screen.getByText('Frontend Developer')).toBeDefined()
    expect(screen.getByText('На модерации')).toBeDefined()
    expect(screen.getByText(/Ожидает проверки модератором/)).toBeDefined()
  })

  it('отображает причину отклонения для rejected-резюме', () => {
    resumeStore.myResumes = [
      {
        documentId: 'r1',
        title: 'QA Engineer',
        moderationStatus: 'rejected',
        rejectionReason: 'incomplete',
        rejectionComment: 'Добавьте опыт работы',
      },
    ]
    render(<PublicationsClient />)
    expect(screen.getByText(/Недостаточно информации/)).toBeDefined()
    expect(screen.getByText(/Добавьте опыт работы/)).toBeDefined()
  })

  it('отображает компанию с бейджем статуса', () => {
    companyStore.myCompanies = [
      { documentId: 'c1', name: 'Acme Inc', moderationStatus: 'published' },
    ]
    render(<PublicationsClient />)
    expect(screen.getByText('Acme Inc')).toBeDefined()
    expect(screen.getByText('Опубликована')).toBeDefined()
  })
})
