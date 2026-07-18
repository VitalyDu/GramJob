import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardClient } from './DashboardClient'

const push = vi.fn()
const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }))

const authState: {
  isAuthenticated: boolean
  isInitializing: boolean
  user: unknown
} = {
  isAuthenticated: true,
  isInitializing: false,
  user: {
    id: 1,
    firstName: 'Иван',
    email: 'ivan@test.io',
    subscriptionPlan: 'free',
    telegramNotificationsEnabled: true,
  },
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    auth: authState,
    payment: {
      plans: [],
      fetchPlans: vi.fn(),
    },
    resume: {
      total: 0,
      fetchMyResumes: vi.fn(),
    },
    limits: {
      data: null,
      isLoading: false,
      error: null,
      fetchLimits: vi.fn(),
    },
  }),
}))

describe('DashboardClient', () => {
  beforeEach(() => {
    replace.mockClear()
    authState.isAuthenticated = true
    authState.isInitializing = false
    authState.user = {
      id: 1,
      firstName: 'Иван',
      email: 'ivan@test.io',
      subscriptionPlan: 'free',
      telegramNotificationsEnabled: true,
    }
  })

  it('показывает заголовок кабинета', () => {
    render(<DashboardClient />)
    expect(screen.getByText('Мой кабинет')).toBeInTheDocument()
  })

  it('не редиректит на /login, пока auth инициализируется (JWT загружен, user ещё не подтянут)', () => {
    // Симулируем состояние сразу после _syncToken: JWT в localStorage прочитан,
    // isInitializing=true, но fetchMe ещё не завершился → isAuthenticated=false, user=null
    authState.isInitializing = true
    authState.isAuthenticated = false
    authState.user = null
    render(<DashboardClient />)
    expect(replace).not.toHaveBeenCalled()
  })

  it('редиректит на /login, если после init пользователь не авторизован', () => {
    authState.isInitializing = false
    authState.isAuthenticated = false
    authState.user = null
    render(<DashboardClient />)
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('показывает разделы кабинета', () => {
    render(<DashboardClient />)
    for (const label of [
      'Мои вакансии',
      'Мои резюме',
      'Мои компании',
      'Мои отклики',
      'Мои публикации',
      'Блокировки',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('показывает кнопку открытия drawer создания', () => {
    render(<DashboardClient />)
    expect(screen.getByRole('button', { name: /быстрые действия/i })).toBeInTheDocument()
  })
})
