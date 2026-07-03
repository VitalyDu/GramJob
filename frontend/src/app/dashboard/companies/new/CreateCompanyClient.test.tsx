import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateCompanyClient } from './CreateCompanyClient'

const mockPush = vi.fn()

vi.mock('@/stores/StoreProvider', () => ({
  useStores: vi.fn(),
}))

vi.mock('@/components/ui/country-select', () => ({
  CountrySelect: ({ value, onChange }: { value: string; onChange: (code: string) => void }) => (
    <input aria-label="Страна" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

vi.mock('@/hooks/useRequireAuth', () => ({ useRequireAuth: () => true }))

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

const mockCompany = {
  id: 1,
  documentId: 'new1',
  name: 'New Corp',
  slug: 'new-corp',
  country: 'RU',
  companySize: 'size_1_10' as const,
  status: 'draft' as const,
  logo: null,
  cover: null,
  owner: null,
  createdAt: '2026-01-01T00:00:00Z',
}

function makeStore(overrides = {}) {
  return {
    isLoading: false,
    error: null,
    createCompany: vi.fn().mockResolvedValue(mockCompany),
    ...overrides,
  }
}

describe('CreateCompanyClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('отображает заголовок страницы', () => {
    vi.mocked(useStores).mockReturnValue({ company: makeStore() } as unknown as ReturnType<
      typeof useStores
    >)
    render(<CreateCompanyClient />)
    expect(screen.getByText(/новая компания/i)).toBeDefined()
  })

  it('отображает форму создания', () => {
    vi.mocked(useStores).mockReturnValue({ company: makeStore() } as unknown as ReturnType<
      typeof useStores
    >)
    render(<CreateCompanyClient />)
    expect(screen.getByLabelText(/название/i)).toBeDefined()
  })

  it('вызывает createCompany при submit формы', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<CreateCompanyClient />)

    fireEvent.change(screen.getByLabelText(/название/i), { target: { value: 'New Corp' } })
    fireEvent.change(screen.getByLabelText(/страна/i), { target: { value: 'RU' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(store.createCompany).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Corp', country: 'RU' })
      )
    })
  })

  it('перенаправляет на /dashboard/companies после успешного создания', async () => {
    const store = makeStore()
    vi.mocked(useStores).mockReturnValue({ company: store } as unknown as ReturnType<
      typeof useStores
    >)
    render(<CreateCompanyClient />)

    fireEvent.change(screen.getByLabelText(/название/i), { target: { value: 'New Corp' } })
    fireEvent.change(screen.getByLabelText(/страна/i), { target: { value: 'RU' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/companies')
    })
  })

  it('показывает ошибку из стора', () => {
    vi.mocked(useStores).mockReturnValue({
      company: makeStore({ error: 'Server error' }),
    } as unknown as ReturnType<typeof useStores>)
    render(<CreateCompanyClient />)
    expect(screen.getByText('Server error')).toBeDefined()
  })
})
