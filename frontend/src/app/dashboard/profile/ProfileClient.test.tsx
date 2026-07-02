import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProfileClient } from './ProfileClient'

const mockPush = vi.fn()
const mockLogout = vi.fn()
let mockUser: Record<string, unknown> | null = null

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ auth: { user: mockUser, logout: mockLogout } }),
}))

describe('ProfileClient', () => {
  it('показывает имя, email и план пользователя', () => {
    mockUser = {
      id: 1,
      firstName: 'Иван',
      lastName: 'Петров',
      email: 'ivan@test.com',
      subscriptionPlan: 'free',
      subscriptionExpiresAt: null,
    }
    render(<ProfileClient />)
    expect(screen.getByText('Иван Петров')).toBeInTheDocument()
    expect(screen.getByText('ivan@test.com')).toBeInTheDocument()
  })

  it('рендерит навигационные ссылки', () => {
    render(<ProfileClient />)
    expect(screen.getByText('Мои публикации')).toBeInTheDocument()
    expect(screen.getByText('Подписка')).toBeInTheDocument()
    expect(screen.getByText('Уведомления')).toBeInTheDocument()
  })

  it('кнопка «Выйти» вызывает logout и редирект на главную', () => {
    render(<ProfileClient />)
    fireEvent.click(screen.getByText('Выйти'))
    expect(mockLogout).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('без пользователя показывает приглашение войти', () => {
    mockUser = null
    render(<ProfileClient />)
    expect(screen.getByText('Войдите, чтобы открыть профиль.')).toBeInTheDocument()
  })
})
