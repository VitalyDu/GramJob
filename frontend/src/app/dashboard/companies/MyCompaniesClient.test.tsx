import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MyCompaniesClient } from './MyCompaniesClient'

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

const draftCompany = {
  id: 1,
  documentId: 'draft1',
  name: 'Draft Corp',
  slug: 'draft-corp',
  country: 'RU',
  city: 'Москва',
  companySize: 'size_1_10' as const,
  status: 'draft' as const,
  logo: null,
  cover: null,
  owner: null,
  createdAt: '2026-01-01T00:00:00Z',
}

const publishedCompany = {
  ...draftCompany,
  documentId: 'pub1',
  name: 'Published Corp',
  status: 'published' as const,
}

function makeStore(overrides = {}) {
  return {
    myCompanies: [],
    isLoading: false,
    error: null,
    page: 1,
    pageCount: 1,
    fetchMyCompanies: vi.fn().mockResolvedValue(undefined),
    submitCompany: vi.fn().mockResolvedValue(undefined),
    deleteCompany: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('MyCompaniesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('вызывает fetchMyCompanies при монтировании', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)

    await waitFor(() => {
      expect(store.fetchMyCompanies).toHaveBeenCalledWith(1)
    })
  })

  it('отображает названия компаний', () => {
    const store = makeStore({ myCompanies: [draftCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)

    expect(screen.getByText('Draft Corp')).toBeDefined()
  })

  it('отображает кнопку "Подать на модерацию" для draft компании', () => {
    const store = makeStore({ myCompanies: [draftCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)

    expect(screen.getByRole('button', { name: /на модерацию/i })).toBeDefined()
  })

  it('НЕ отображает кнопку "Подать на модерацию" для published компании', () => {
    const store = makeStore({ myCompanies: [publishedCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)

    expect(screen.queryByRole('button', { name: /на модерацию/i })).toBeNull()
  })

  it('вызывает submitCompany при клике', async () => {
    const store = makeStore({ myCompanies: [draftCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)
    fireEvent.click(screen.getByRole('button', { name: /на модерацию/i }))

    await waitFor(() => {
      expect(store.submitCompany).toHaveBeenCalledWith('draft1')
    })
  })

  it('отображает кнопку "Удалить" для draft компании', () => {
    const store = makeStore({ myCompanies: [draftCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)

    expect(screen.getByRole('button', { name: /удалить/i })).toBeDefined()
  })

  it('вызывает deleteCompany при подтверждении удаления', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const store = makeStore({ myCompanies: [draftCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)
    fireEvent.click(screen.getByRole('button', { name: /удалить/i }))

    await waitFor(() => {
      expect(store.deleteCompany).toHaveBeenCalledWith('draft1')
    })
  })

  it('НЕ вызывает deleteCompany если пользователь отменил', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const store = makeStore({ myCompanies: [draftCompany] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)
    fireEvent.click(screen.getByRole('button', { name: /удалить/i }))

    expect(store.deleteCompany).not.toHaveBeenCalled()
  })

  it('отображает ссылку "Создать компанию"', () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)

    const links = screen.getAllByRole('link', { name: /создать/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]!.getAttribute('href')).toBe('/dashboard/companies/new')
  })

  it('отображает сообщение если нет компаний', () => {
    const store = makeStore({ myCompanies: [] })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)

    render(<MyCompaniesClient />)

    expect(screen.getByText(/у вас пока нет компаний/i)).toBeDefined()
  })
})
