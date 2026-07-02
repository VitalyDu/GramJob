import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CompanyForm } from './CompanyForm'

function mockTelegramMainButton() {
  const MainButton = {
    text: '',
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    showProgress: vi.fn(),
    hideProgress: vi.fn(),
  }
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: { initData: 'user=1', MainButton },
  }
  return MainButton
}

describe('CompanyForm в Mini App', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
  })

  it('в Mini App скрывает submit-кнопку и показывает MainButton', async () => {
    const mb = mockTelegramMainButton()
    render(<CompanyForm onSubmit={vi.fn()} />)
    await waitFor(() => expect(mb.show).toHaveBeenCalled())
    expect(mb.text).toBe('Сохранить')
    expect(screen.queryByRole('button', { name: 'Сохранить' })).not.toBeInTheDocument()
  })

  it('вне Mini App submit-кнопка на месте', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
  })
})
