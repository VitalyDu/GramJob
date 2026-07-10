import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockAuth = {
  forgotPassword: vi.fn(),
  isLoading: false,
  error: null as string | null,
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ auth: mockAuth }),
}))

import { ForgotPasswordCard } from './ForgotPasswordCard'

describe('ForgotPasswordCard', () => {
  beforeEach(() => {
    mockAuth.forgotPassword.mockReset().mockResolvedValue(undefined)
    mockAuth.error = null
  })

  it('рендерит поле email и кнопку отправки', () => {
    render(<ForgotPasswordCard />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отправить ссылку' })).toBeInTheDocument()
  })

  it('не отправляет форму при некорректном email', async () => {
    render(<ForgotPasswordCard />)
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }))
    expect(mockAuth.forgotPassword).not.toHaveBeenCalled()
  })

  it('вызывает forgotPassword и показывает success-сообщение', async () => {
    render(<ForgotPasswordCard />)
    await userEvent.type(screen.getByLabelText('Email'), 'user@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }))
    expect(mockAuth.forgotPassword).toHaveBeenCalledWith('user@test.com')
    expect(await screen.findByText(/мы отправили письмо/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).toBeNull()
  })

  it('не показывает success-сообщение при ошибке запроса', async () => {
    mockAuth.forgotPassword.mockRejectedValueOnce(new Error('fail'))
    render(<ForgotPasswordCard />)
    await userEvent.type(screen.getByLabelText('Email'), 'user@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }))
    expect(screen.queryByText(/мы отправили письмо/)).toBeNull()
  })

  it('содержит ссылку «Вернуться ко входу» на /login', () => {
    render(<ForgotPasswordCard />)
    const link = screen.getByRole('link', { name: 'Вернуться ко входу' })
    expect(link.getAttribute('href')).toBe('/login')
  })
})
