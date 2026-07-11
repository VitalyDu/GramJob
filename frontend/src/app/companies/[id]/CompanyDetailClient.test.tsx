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

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
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
  moderationStatus: 'published' as const,
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
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="abc123" />)

    await waitFor(() => {
      expect(store.fetchCompanyById).toHaveBeenCalledWith('abc123')
    })
  })

  it('отображает skeleton во время загрузки', () => {
    const store = makeStore({ isLoading: true })
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getAllByTestId('card-skeleton').length).toBeGreaterThan(0)
  })

  it('отображает ошибку если компания не найдена', () => {
    const store = makeStore({ error: 'Not found', currentCompany: null })
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('Not found')).toBeDefined()
  })

  it('отображает название компании', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('отображает описание компании', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('Мы делаем крутые продукты')).toBeDefined()
  })

  it('отображает страну и город как Badge', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('Россия')).toBeDefined()
    expect(screen.getByText('Москва')).toBeDefined()
  })

  it('отображает размер компании в читаемом виде', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="abc123" />)

    expect(screen.getByText('51–200')).toBeDefined()
  })

  it('отображает ссылку на сайт с иконкой', () => {
    const store = makeStore({ currentCompany: mockCompany })
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="abc123" />)

    const link = screen.getByRole('link', { name: /acme\.com/i })
    expect(link.getAttribute('href')).toBe('https://acme.com')
  })

  it('renders SSR initial company while store has no data', () => {
    const store = makeStore({ currentCompany: null, isLoading: true, error: null })
    vi.mocked(useStores).mockReturnValue({
      company: store,
      auth: { user: null },
    } as unknown as ReturnType<typeof useStores>)

    render(<CompanyDetailClient id="comp1" initialCompany={mockCompany} />)

    expect(screen.getByText(mockCompany.name)).toBeDefined()
  })
})
