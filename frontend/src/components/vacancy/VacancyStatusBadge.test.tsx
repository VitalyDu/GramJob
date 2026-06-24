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

  it('применяет зелёный класс для published', () => {
    const { container } = render(<VacancyStatusBadge status="published" />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('green')
  })

  it('применяет красный класс для rejected', () => {
    const { container } = render(<VacancyStatusBadge status="rejected" />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('red')
  })

  it('применяет оранжевый класс для expired', () => {
    const { container } = render(<VacancyStatusBadge status="expired" />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('orange')
  })
})
