import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUseStores = vi.fn()
vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => mockUseStores(),
}))

vi.mock('./UserMenuDrawer', () => ({
  UserMenuDrawer: () => null,
}))

vi.mock('./LanguageDrawer', () => ({
  LanguageDrawer: () => null,
}))

import { TelegramTopBar } from './TelegramTopBar'

const unauthStores = () => ({
  auth: { isAuthenticated: false, user: null },
  notification: { unreadCount: 0 },
})

const authStores = () => ({
  auth: {
    isAuthenticated: true,
    user: {
      firstName: 'Alice',
      lastName: '',
      email: 'alice@example.com',
      subscriptionPlan: 'free' as const,
    },
  },
  notification: { unreadCount: 0 },
})

describe('TelegramTopBar', () => {
  beforeEach(() => {
    mockUseStores.mockReset()
  })

  it('Globe-кнопка рендерится для неавторизованного пользователя', () => {
    mockUseStores.mockReturnValue(unauthStores())
    render(<TelegramTopBar />)
    expect(screen.getByLabelText('Язык интерфейса')).toBeInTheDocument()
  })

  it('Avatar и Bell не рендерятся для неавторизованного', () => {
    mockUseStores.mockReturnValue(unauthStores())
    render(<TelegramTopBar />)
    expect(screen.queryByLabelText('Меню пользователя')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Уведомления')).not.toBeInTheDocument()
  })

  it('Avatar и Bell рендерятся для авторизованного', () => {
    mockUseStores.mockReturnValue(authStores())
    render(<TelegramTopBar />)
    expect(screen.getByLabelText('Меню пользователя')).toBeInTheDocument()
    expect(screen.getByLabelText('Уведомления')).toBeInTheDocument()
  })

  it('показывает счётчик непрочитанных уведомлений', () => {
    mockUseStores.mockReturnValue({
      ...authStores(),
      notification: { unreadCount: 5 },
    })
    render(<TelegramTopBar />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
