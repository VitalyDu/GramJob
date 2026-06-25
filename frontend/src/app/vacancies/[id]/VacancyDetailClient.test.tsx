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

function makeStore(overrides = {}) {
  return {
    currentVacancy: null,
    isLoading: false,
    error: null,
    fetchVacancyById: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('VacancyDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('вызывает fetchVacancyById при монтировании', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    await waitFor(() => {
      expect(store.fetchVacancyById).toHaveBeenCalledWith('vac123')
    })
  })

  it('отображает загрузку', () => {
    const store = makeStore({ isLoading: true })
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('отображает "не найдена" если currentVacancy=null и нет загрузки', () => {
    const store = makeStore({ currentVacancy: null })
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText(/не найден/i)).toBeDefined()
  })

  it('отображает название вакансии', () => {
    const store = makeStore({ currentVacancy: mockVacancy })
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Senior Frontend Developer')).toBeDefined()
  })

  it('отображает название компании', () => {
    const store = makeStore({ currentVacancy: mockVacancy })
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('отображает формат работы', () => {
    const store = makeStore({ currentVacancy: mockVacancy })
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Удалённо')).toBeDefined()
  })

  it('отображает зарплату', () => {
    const store = makeStore({ currentVacancy: mockVacancy })
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText(/5\s*000/)).toBeDefined()
  })

  it('отображает описание', () => {
    const store = makeStore({ currentVacancy: mockVacancy })
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    expect(screen.getByText('Мы ищем опытного разработчика.')).toBeDefined()
  })

  it('отображает кнопку "Apply on Source" для external вакансий', () => {
    const externalVacancy = {
      ...mockVacancy,
      sourceType: 'external' as const,
      sourceUrl: 'https://example.com/job',
    }
    const store = makeStore({ currentVacancy: externalVacancy })
    vi.mocked(useStores).mockReturnValue({ vacancy: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<VacancyDetailClient id="vac123" />)

    const link = screen.getByRole('link', { name: /apply on source/i })
    expect(link.getAttribute('href')).toBe('https://example.com/job')
  })
})
