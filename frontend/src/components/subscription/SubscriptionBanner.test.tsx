import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SubscriptionBanner } from './SubscriptionBanner'

let mockPlan = 'free'
vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    auth: { user: { subscriptionPlan: mockPlan } },
  }),
}))

describe('SubscriptionBanner', () => {
  it('показывается для free', () => {
    mockPlan = 'free'
    const { container } = render(<SubscriptionBanner />)
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/subscription')
  })

  it('показывается для pro', () => {
    mockPlan = 'pro'
    render(<SubscriptionBanner />)
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('не показывается для max и vip', () => {
    mockPlan = 'max'
    const { container } = render(<SubscriptionBanner />)
    expect(container.firstChild).toBeNull()
  })
})
