import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    auth: { loginWithEmail: vi.fn(), isLoading: false, error: null },
  }),
}))

import { EmailLoginForm } from './EmailLoginForm'

describe('EmailLoginForm', () => {
  it('содержит ссылку «Забыли пароль?» на /forgot-password', () => {
    render(<EmailLoginForm />)
    const link = screen.getByRole('link', { name: 'Забыли пароль?' })
    expect(link.getAttribute('href')).toBe('/forgot-password')
  })
})
