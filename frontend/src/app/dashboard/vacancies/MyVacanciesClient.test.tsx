import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyVacanciesClient } from './MyVacanciesClient'

const mockStore = {
  vacancy: {
    myVacancies: [],
    isLoading: false,
    error: null,
    total: 0,
    page: 1,
    pageSize: 20,
    pageCount: 0,
    limitReached: false,
    boostsRemaining: null,
    fetchMyVacancies: vi.fn(),
    publishVacancy: vi.fn(),
    boostVacancy: vi.fn(),
    archiveVacancy: vi.fn(),
    clearLimitReached: vi.fn(),
  },
  auth: { user: { subscriptionPlan: 'free', vacancyCredits: 0 }, isAuthenticated: true },
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => mockStore,
}))

vi.mock('@/hooks/useRequireAuth', () => ({ useRequireAuth: () => true }))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('MyVacanciesClient', () => {
  it('показывает пустое состояние без вакансий', () => {
    render(<MyVacanciesClient />)
    expect(screen.getByText(/нет вакансий/i)).toBeTruthy()
  })

  it('показывает ссылку "Создать вакансию"', () => {
    render(<MyVacanciesClient />)
    expect(screen.getAllByText(/Создать вакансию/).length).toBeGreaterThan(0)
  })

  it('показывает UpsellModal при limitReached = true', () => {
    mockStore.vacancy.limitReached = true
    render(<MyVacanciesClient />)
    expect(screen.getByText(/Лимит исчерпан/i)).toBeTruthy()
    mockStore.vacancy.limitReached = false
  })
})
