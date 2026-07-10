import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockSearchParams, mockPush } = vi.hoisted(() => ({
  mockSearchParams: { current: new URLSearchParams() },
  mockPush: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/reset-password',
  useSearchParams: () => mockSearchParams.current,
}))

const mockAuth = {
  resetPassword: vi.fn(),
  isLoading: false,
  error: null as string | null,
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ auth: mockAuth }),
}))

import { ResetPasswordCard } from './ResetPasswordCard'

describe('ResetPasswordCard', () => {
  beforeEach(() => {
    mockSearchParams.current = new URLSearchParams('code=abc123')
    mockAuth.resetPassword.mockReset().mockResolvedValue(undefined)
    mockAuth.error = null
    mockPush.mockReset()
  })

  it('без code показывает ошибку и ссылку на /forgot-password, форму не рендерит', () => {
    mockSearchParams.current = new URLSearchParams()
    render(<ResetPasswordCard />)
    expect(screen.getByText(/отсутствует код сброса/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Запросить новую ссылку' })
    expect(link.getAttribute('href')).toBe('/forgot-password')
    expect(screen.queryByLabelText('Новый пароль')).toBeNull()
  })

  it('с code рендерит форму нового пароля', () => {
    render(<ResetPasswordCard />)
    expect(screen.getByLabelText('Новый пароль')).toBeInTheDocument()
    expect(screen.getByLabelText('Подтвердите пароль')).toBeInTheDocument()
  })

  it('показывает ошибку при несовпадении паролей', async () => {
    render(<ResetPasswordCard />)
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'newpass1')
    await userEvent.type(screen.getByLabelText('Подтвердите пароль'), 'other')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить пароль' }))
    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument()
    expect(mockAuth.resetPassword).not.toHaveBeenCalled()
  })

  it('вызывает resetPassword с code и редиректит на /', async () => {
    render(<ResetPasswordCard />)
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'newpass1')
    await userEvent.type(screen.getByLabelText('Подтвердите пароль'), 'newpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить пароль' }))
    expect(mockAuth.resetPassword).toHaveBeenCalledWith('abc123', 'newpass1', 'newpass1')
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('при ошибке кода показывает auth.error и ссылку «Запросить новую ссылку»', async () => {
    mockAuth.resetPassword.mockRejectedValueOnce(new Error('bad code'))
    mockAuth.error = 'Ссылка недействительна или устарела'
    render(<ResetPasswordCard />)
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'newpass1')
    await userEvent.type(screen.getByLabelText('Подтвердите пароль'), 'newpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить пароль' }))
    expect(await screen.findByText('Ссылка недействительна или устарела')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Запросить новую ссылку' }).getAttribute('href')).toBe(
      '/forgot-password'
    )
    expect(mockPush).not.toHaveBeenCalled()
  })
})
