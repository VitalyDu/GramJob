import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardClient } from './DashboardClient'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    auth: {
      isAuthenticated: true,
      user: {
        id: 1,
        firstName: 'Иван',
        email: 'ivan@test.io',
        subscriptionPlan: 'free',
        telegramNotificationsEnabled: true,
      },
    },
  }),
}))

describe('DashboardClient', () => {
  it('показывает заголовок кабинета', () => {
    render(<DashboardClient />)
    expect(screen.getByText('Мой кабинет')).toBeInTheDocument()
  })

  it('показывает разделы кабинета', () => {
    render(<DashboardClient />)
    for (const label of [
      'Мои вакансии',
      'Мои резюме',
      'Мои компании',
      'Отклики',
      'Мои публикации',
      'Блокировки',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('показывает быстрые действия', () => {
    render(<DashboardClient />)
    expect(screen.getByRole('link', { name: /создать вакансию/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /создать резюме/i })).toBeInTheDocument()
  })

  it('показывает баннер подписки для free пользователя', () => {
    render(<DashboardClient />)
    const subscriptionLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/subscription')
    expect(subscriptionLinks.length).toBeGreaterThan(0)
  })
})
