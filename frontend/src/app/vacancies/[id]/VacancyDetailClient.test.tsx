import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { VacancyDetailClient } from './VacancyDetailClient'

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
}))

import { useStores } from '@/stores/StoreProvider'
import type { WorkFormatEnum, EmploymentTypeEnum, SeniorityEnum } from '@/types/api'

const mockVacancy = {
  id: 1,
  documentId: 'vac123',
  title: 'Senior Frontend Developer',
  country: 'RU',
  city: 'Москва',
  workFormat: ['remote'] as WorkFormatEnum[],
  employmentType: ['full-time'] as EmploymentTypeEnum[],
  seniority: ['senior'] as SeniorityEnum[],
  sourceType: 'internal' as const,
  highlighted: false,
  urgent: false,
  topPlacement: false,
  moderationStatus: 'published' as const,
  description: 'Мы ищем опытного разработчика.',
  responsibilities: 'Разработка фронтенда.',
  requirements: 'Знание React.',
  salaryFrom: 5000,
  salaryTo: 8000,
  salaryCurrency: 'USD' as const,
  skills: ['React', 'TypeScript'],
  createdAt: '2026-01-01T00:00:00Z',
  industry: { documentId: 'ind1', slug: 'it', name: { ru: 'IT', en: 'IT' } },
  specialization: {
    documentId: 'spec1',
    slug: 'frontend',
    name: { ru: 'Фронтенд', en: 'Frontend' },
  },
  company: { documentId: 'comp1', name: 'Acme Corp', slug: 'acme-corp', logo: null },
}

const mockAppStore = {
  isLoading: false,
  limitReached: false,
  alreadyApplied: false,
  clearFlags: vi.fn(),
  createApplication: vi.fn().mockResolvedValue(undefined),
}

const mockAuth = {
  user: null,
}

function makeStore(overrides = {}) {
  return {
    currentVacancy: null,
    isLoading: false,
    error: null,
    fetchVacancyById: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeUseStoresReturn(vacancyOverrides = {}) {
  return {
    vacancy: makeStore(vacancyOverrides),
    application: mockAppStore,
    auth: mockAuth,
  } as unknown as ReturnType<typeof useStores>
}

describe('VacancyDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('вызывает fetchVacancyById при монтировании', async () => {
    const storesReturn = makeUseStoresReturn()
    vi.mocked(useStores).mockReturnValue(storesReturn)

    render(<VacancyDetailClient id="vac123" />)

    await waitFor(() => {
      expect(storesReturn.vacancy.fetchVacancyById).toHaveBeenCalledWith('vac123')
    })
  })

  it('отображает скелетон загрузки', () => {
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ isLoading: true }))

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getAllByTestId('card-skeleton').length).toBeGreaterThan(0)
  })

  it('отображает ErrorState если currentVacancy=null и нет загрузки', () => {
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: null }))

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText(/не удалось загрузить вакансию/i)).toBeDefined()
  })

  it('отображает название вакансии', () => {
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: mockVacancy }))

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Senior Frontend Developer')).toBeDefined()
  })

  it('отображает название компании', () => {
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: mockVacancy }))

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('отображает формат работы', () => {
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: mockVacancy }))

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Удалённо')).toBeDefined()
  })

  it('отображает зарплату', () => {
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: mockVacancy }))

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText(/5\s*000/)).toBeDefined()
  })

  it('отображает описание', () => {
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: mockVacancy }))

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Мы ищем опытного разработчика.')).toBeDefined()
  })

  it('отображает кнопку "Apply on Source" для external вакансий', () => {
    const externalVacancy = {
      ...mockVacancy,
      sourceType: 'external' as const,
      sourceUrl: 'https://example.com/job',
    }
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: externalVacancy }))

    render(<VacancyDetailClient id="vac123" />)

    const link = screen.getByRole('link', { name: /apply on source/i })
    expect(link.getAttribute('href')).toBe('https://example.com/job')
  })

  it('рендерится без падения, если company=null', () => {
    const noCompanyVacancy = { ...mockVacancy, company: null }
    vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: noCompanyVacancy }))

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Senior Frontend Developer')).toBeDefined()
  })

  it('renders SSR initial vacancy while store has no data', () => {
    vi.mocked(useStores).mockReturnValue(
      makeUseStoresReturn({ currentVacancy: null, isLoading: true })
    )

    render(<VacancyDetailClient id="vac123" initialVacancy={mockVacancy as never} />)

    expect(screen.getByText(mockVacancy.title)).toBeDefined()
  })
})
