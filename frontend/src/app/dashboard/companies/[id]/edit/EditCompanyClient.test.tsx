import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditCompanyClient } from './EditCompanyClient'

const mockPush = vi.fn()

vi.mock('@/stores/StoreProvider', () => ({
  useStores: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

const existingCompany = {
  id: 1,
  documentId: 'abc123',
  name: 'Acme Corp',
  slug: 'acme-corp',
  description: 'Old description',
  country: 'RU',
  city: 'Москва',
  companySize: 'size_11_50' as const,
  status: 'draft' as const,
  website: 'https://acme.com',
  telegram: '',
  linkedin: '',
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
    updateCompany: vi.fn().mockResolvedValue(existingCompany),
    ...overrides,
  }
}

describe('EditCompanyClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('вызывает fetchCompanyById при монтировании', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<EditCompanyClient id="abc123" />)

    await waitFor(() => {
      expect(store.fetchCompanyById).toHaveBeenCalledWith('abc123')
    })
  })

  it('отображает загрузку пока нет данных', () => {
    const store = makeStore({ isLoading: true })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<EditCompanyClient id="abc123" />)

    expect(screen.getByText(/загрузка/i)).toBeDefined()
  })

  it('отображает заголовок "Редактировать"', () => {
    const store = makeStore({ currentCompany: existingCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<EditCompanyClient id="abc123" />)

    expect(screen.getByText(/редактировать/i)).toBeDefined()
  })

  it('заполняет форму данными текущей компании', () => {
    const store = makeStore({ currentCompany: existingCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<EditCompanyClient id="abc123" />)

    const nameInput = screen.getByLabelText(/название/i) as HTMLInputElement
    expect(nameInput.value).toBe('Acme Corp')
  })

  it('вызывает updateCompany при submit', async () => {
    const store = makeStore({ currentCompany: existingCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<EditCompanyClient id="abc123" />)

    fireEvent.change(screen.getByLabelText(/название/i), { target: { value: 'Updated Corp' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(store.updateCompany).toHaveBeenCalledWith(
        'abc123',
        expect.objectContaining({ name: 'Updated Corp' })
      )
    })
  })

  it('перенаправляет на /dashboard/companies после сохранения', async () => {
    const store = makeStore({ currentCompany: existingCompany })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<EditCompanyClient id="abc123" />)

    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/companies')
    })
  })

  it('показывает ошибку из стора', () => {
    const store = makeStore({ currentCompany: existingCompany, error: 'Update failed' })
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<EditCompanyClient id="abc123" />)

    expect(screen.getByText('Update failed')).toBeDefined()
  })
})
