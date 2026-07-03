import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardClient } from './DashboardClient'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    auth: {
      isAuthenticated: true,
      user: { id: 1, firstName: 'Иван', email: 'ivan@test.io', subscriptionPlan: 'free' },
    },
    notification: { unreadCount: 3, fetchUnreadCount: vi.fn() },
  }),
}))

describe('DashboardClient', () => {
  it('показывает приветствие с именем пользователя', () => {
    render(<DashboardClient />)
    expect(screen.getByText(/Иван/)).toBeInTheDocument()
  })

  it('показывает разделы кабинета', () => {
    render(<DashboardClient />)
    for (const label of [
      'Мои вакансии',
      'Мои резюме',
      'Мои компании',
      'Отклики',
      'Избранное',
      'Уведомления',
      'Подписка',
      'Профиль',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('показывает счётчик непрочитанных уведомлений', () => {
    render(<DashboardClient />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('показывает быстрые действия', () => {
    render(<DashboardClient />)
    expect(screen.getByRole('link', { name: /создать вакансию/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /создать резюме/i })).toBeInTheDocument()
  })
})
