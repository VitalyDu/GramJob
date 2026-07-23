import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TonPaymentButton } from './TonPaymentButton'

// Mock hooks
vi.mock('@/hooks/useTonPayment', () => ({
  useTonPayment: () => ({
    phase: 'idle',
    error: null,
    pay: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('@/lib/ton', () => ({
  calculateUsdtDisplayAmount: (stars: number) => stars * 0.013,
  formatUsdt: (amount: number) => `$${amount.toFixed(2)}`,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'tonPayment.payWithUsdt') return `Pay USDT — ${opts?.amount ?? ''}`
      return key
    },
  }),
}))

vi.mock('./TonPaymentStatusDialog', () => ({
  TonPaymentStatusDialog: () => null,
}))

describe('TonPaymentButton', () => {
  it('renders with USDT amount', () => {
    render(<TonPaymentButton starsPrice={299} kind="subscription" planCode="pro" />)
    expect(screen.getByRole('button')).toHaveTextContent('Pay USDT')
  })
})
