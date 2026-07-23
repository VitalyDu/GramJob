import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpsellModal } from './UpsellModal'

describe('UpsellModal', () => {
  it('не рендерится когда isOpen=false', () => {
    const { container } = render(<UpsellModal isOpen={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('отображает заголовок когда isOpen=true', () => {
    render(<UpsellModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText(/лимит/i)).toBeDefined()
  })

  it('вызывает onClose при клике на кнопку закрытия', () => {
    const onClose = vi.fn()
    render(<UpsellModal isOpen={true} onClose={onClose} />)
    const closeBtn = screen.getByRole('button', { name: /закрыть/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('вызывает onClose при клике на оверлей', () => {
    const onClose = vi.fn()
    const { container } = render(<UpsellModal isOpen={true} onClose={onClose} />)
    const overlay = container.querySelector('[data-overlay]')
    if (overlay) fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('отображает варианты апгрейда из переданных планов', () => {
    const plans = [
      {
        id: 1,
        code: 'pro' as const,
        name: 'Pro',
        vacanciesPerMonth: 10,
        starsPrice: 299,
        durationDays: 30,
        activeVacanciesLimit: 10,
        vacancyBoostsPerDay: 10,
        resumesLimit: 5,
        applicationsPerDay: 10,
        resumeDatabaseAccess: false,
        documentId: 'pro',
      },
      {
        id: 2,
        code: 'max' as const,
        name: 'Max',
        vacanciesPerMonth: 50,
        starsPrice: 999,
        durationDays: 30,
        activeVacanciesLimit: 50,
        vacancyBoostsPerDay: 50,
        resumesLimit: 20,
        applicationsPerDay: 50,
        resumeDatabaseAccess: true,
        documentId: 'max',
      },
    ]
    render(<UpsellModal isOpen={true} onClose={vi.fn()} plans={plans} />)
    expect(screen.getByText('Pro')).toBeDefined()
    expect(screen.getByText('Max')).toBeDefined()
  })
})
