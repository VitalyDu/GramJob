import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CompanyDetailClient } from './CompanyDetailClient'

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

const mockCompany = {
  id: 1,
  documentId: 'abc123',
  name: 'Acme Corp',
  slug: 'acme-corp',
  country: 'RU',
  city: 'Москва',
  companySize: 'size_51_200' as const,
  status: 'published' as const,
  description: 'Мы делаем крутые продукты',
  website: 'https://acme.com',
  telegram: '@acmecorp',
  linkedin: 'https://linkedin.com/company/acme',
  logo: null,
  cover: null,
  owner: null,
  createdAt: '2026-01-01T00:00:00Z',
}

function makeStore(overrides = {}) {
  return {
    currentCompany: null,
    isLoading: false,
    error: null,
    fetchCompanyById: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('CompanyDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('вызывает fetchCompanyById при монтировании', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompanyDetailClient id="abc123" />)

    await waitFor(() => {
      expect(store.fetchCompanyById).toHaveBeenCalledWith('abc123')
    })
  })

  it('отображает индикатор загрузки', () => {
    const store = makeStore({ isLoading: true })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('отображает ошибку 404 если компания не найдена', () => {
    const store = makeStore({ error: 'Not found', currentCompany: null })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText(/не найдена/i)).toBeDefined()
  })

  it('отображает название компании', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('отображает описание компании', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('Мы делаем крутые продукты')).toBeDefined()
  })

  it('отображает страну и город', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('RU')).toBeDefined()
    expect(screen.getByText('Москва')).toBeDefined()
  })

  it('отображает размер компании в читаемом виде', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('51–200')).toBeDefined()
  })

  it('отображает ссылку на сайт', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompanyDetailClient id="abc123" />)

    const link = screen.getByRole('link', { name: /acme\.com/i })
    expect(link.getAttribute('href')).toBe('https://acme.com')
  })
})
