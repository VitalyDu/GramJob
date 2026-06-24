import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompaniesClient } from './CompaniesClient'

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
  companySize: 'size_11_50' as const,
  status: 'published' as const,
  logo: null,
  cover: null,
  owner: null,
  createdAt: '2026-01-01T00:00:00Z',
}

function makeStore(overrides = {}) {
  return {
    companies: [],
    isLoading: false,
    error: null,
    page: 1,
    pageCount: 1,
    fetchCompanies: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('CompaniesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('вызывает fetchCompanies при монтировании', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompaniesClient />)

    await waitFor(() => {
      expect(store.fetchCompanies).toHaveBeenCalledWith({ page: 1 })
    })
  })

  it('отображает компании из стора', () => {
    const store = makeStore({ companies: [mockCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompaniesClient />)

    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('отображает сообщение о загрузке', () => {
    const store = makeStore({ isLoading: true })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompaniesClient />)

    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('отображает ошибку из стора', () => {
    const store = makeStore({ error: 'Network error' })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompaniesClient />)

    expect(screen.getByText('Network error')).toBeDefined()
  })

  it('отображает "не найдены" если список пуст', () => {
    const store = makeStore({ companies: [] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompaniesClient />)

    expect(screen.getByText(/не найдены/i)).toBeDefined()
  })

  it('вызывает fetchCompanies с параметрами при поиске', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompaniesClient />)

    fireEvent.change(screen.getByPlaceholderText(/поиск компании/i), {
      target: { value: 'tech' },
    })
    fireEvent.click(screen.getByRole('button', { name: /найти/i }))

    await waitFor(() => {
      expect(store.fetchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'tech', page: 1 })
      )
    })
  })

  it('не показывает пагинацию если pageCount <= 1', () => {
    const store = makeStore({ pageCount: 1 })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompaniesClient />)

    expect(screen.queryByText(/назад/i)).toBeNull()
  })

  it('показывает пагинацию если pageCount > 1', () => {
    const store = makeStore({ pageCount: 3, page: 2, companies: [mockCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<CompaniesClient />)

    expect(screen.getByText(/назад/i)).toBeDefined()
    expect(screen.getByText('2 / 3')).toBeDefined()
  })
})
