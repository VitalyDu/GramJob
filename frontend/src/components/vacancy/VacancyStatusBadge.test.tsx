import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VacancyStatusBadge } from './VacancyStatusBadge'

describe('VacancyStatusBadge', () => {
  it('отображает "Черновик" для статуса draft', () => {
    render(<VacancyStatusBadge status="draft" />)
    expect(screen.getByText('Черновик')).toBeDefined()
  })

  it('отображает "На модерации" для статуса moderation', () => {
    render(<VacancyStatusBadge status="moderation" />)
    expect(screen.getByText('На модерации')).toBeDefined()
  })

  it('отображает "Опубликована" для статуса published', () => {
    render(<VacancyStatusBadge status="published" />)
    expect(screen.getByText('Опубликована')).toBeDefined()
  })

  it('отображает "Отклонена" для статуса rejected', () => {
    render(<VacancyStatusBadge status="rejected" />)
    expect(screen.getByText('Отклонена')).toBeDefined()
  })

  it('отображает "Истекла" для статуса expired', () => {
    render(<VacancyStatusBadge status="expired" />)
    expect(screen.getByText('Истекла')).toBeDefined()
  })

  it('отображает "В архиве" для статуса archived', () => {
    render(<VacancyStatusBadge status="archived" />)
    expect(screen.getByText('В архиве')).toBeDefined()
  })

  it('применяет вариант bg-success для published', () => {
    const { container } = render(<VacancyStatusBadge status="published" />)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge?.className).toContain('bg-success')
  })

  it('применяет destructive вариант для rejected', () => {
    const { container } = render(<VacancyStatusBadge status="rejected" />)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge?.getAttribute('data-variant')).toBe('destructive')
  })

  it('применяет outline вариант для expired', () => {
    const { container } = render(<VacancyStatusBadge status="expired" />)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge?.getAttribute('data-variant')).toBe('outline')
  })
})
