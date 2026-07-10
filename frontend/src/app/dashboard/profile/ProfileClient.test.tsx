import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfileClient } from './ProfileClient'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/dashboard/profile',
}))
vi.mock('@/hooks/useRequireAuth', () => ({ useRequireAuth: vi.fn() }))

const makeStores = (overrides: Record<string, unknown> = {}) => ({
  auth: {
    isAuthenticated: true,
    user: {
      id: 1,
      firstName: 'Иван',
      lastName: 'Иванов',
      email: 'ivan@test.io',
      telegramId: null,
      avatar: null,
      subscriptionPlan: 'free',
      telegramNotificationsEnabled: true,
      ...overrides,
    },
    logout: vi.fn(),
  },
})

vi.mock('@/stores/StoreProvider', () => ({ useStores: () => makeStores() }))

describe('ProfileClient', () => {
  it('рендерит форму профиля с полями имени', () => {
    render(<ProfileClient />)
    expect(screen.getByLabelText(/имя/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/фамилия/i)).toBeInTheDocument()
  })

  it('рендерит кнопку смены аватара', () => {
    render(<ProfileClient />)
    expect(screen.getByRole('button', { name: /аватар/i })).toBeInTheDocument()
  })

  it('не показывает тумблер уведомлений без telegramId', () => {
    render(<ProfileClient />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
