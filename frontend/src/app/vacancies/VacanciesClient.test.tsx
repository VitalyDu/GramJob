import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { VacanciesClient } from './VacanciesClient'

vi.mock('@/stores/StoreProvider', () => ({
  useStores: vi.fn(),
}))

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

import { useStores } from '@/stores/StoreProvider'

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
  status: 'published' as const,
  createdAt: '2026-01-01T00:00:00Z',
  industry: { documentId: 'ind1', slug: 'it', name: { ru: 'IT', en: 'IT' } },
  specialization: {
    documentId: 'spec1',
    slug: 'frontend',
    name: { ru: 'Фронтенд', en: 'Frontend' },
  },
  company: { documentId: 'comp1', name: 'Acme Corp', slug: 'acme-corp', logo: null },
}

function makeStore(overrides = {}) {
  return {
    vacancies: [],
    isLoading: false,
    error: null,
    page: 1,
    pageCount: 1,
    fetchVacancies: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('VacanciesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('вызывает fetchVacancies при монтировании', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({
      vacancy: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<VacanciesClient />)

    await waitFor(() => {
      expect(store.fetchVacancies).toHaveBeenCalledWith({ page: 1 })
    })
  })

  it('отображает вакансии из стора', () => {
    const store = makeStore({ vacancies: [mockVacancy] })
    vi.mocked(useStores).mockReturnValue({
      vacancy: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<VacanciesClient />)

    expect(screen.getByText('Senior Frontend Developer')).toBeDefined()
  })

  it('отображает скелетон при загрузке', () => {
    const store = makeStore({ isLoading: true })
    vi.mocked(useStores).mockReturnValue({
      vacancy: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<VacanciesClient />)

    expect(screen.getAllByTestId('card-skeleton').length).toBeGreaterThan(0)
  })

  it('отображает ошибку из стора', () => {
    const store = makeStore({ error: 'Network error' })
    vi.mocked(useStores).mockReturnValue({
      vacancy: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<VacanciesClient />)

    expect(screen.getByText('Network error')).toBeDefined()
  })

  it('отображает "не найдены" если список пуст', () => {
    const store = makeStore({ vacancies: [] })
    vi.mocked(useStores).mockReturnValue({
      vacancy: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<VacanciesClient />)

    expect(screen.getByText(/не найден/i)).toBeDefined()
  })

  it('не показывает пагинацию если pageCount <= 1', () => {
    const store = makeStore({ pageCount: 1 })
    vi.mocked(useStores).mockReturnValue({
      vacancy: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<VacanciesClient />)

    expect(screen.queryByRole('navigation', { name: /пагинация/i })).toBeNull()
  })

  it('показывает пагинацию если pageCount > 1', () => {
    const store = makeStore({ pageCount: 3, page: 2, vacancies: [mockVacancy] })
    vi.mocked(useStores).mockReturnValue({
      vacancy: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<VacanciesClient />)

    expect(screen.getByRole('navigation', { name: /пагинация/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /предыдущая страница/i })).toBeDefined()
  })
})
