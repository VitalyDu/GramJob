import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('отображает "Черновик" для статуса draft', () => {
    render(<StatusBadge status="draft" />)
    expect(screen.getByText('Черновик')).toBeDefined()
  })

  it('отображает "На модерации" для статуса moderation', () => {
    render(<StatusBadge status="moderation" />)
    expect(screen.getByText('На модерации')).toBeDefined()
  })

  it('отображает "Опубликована" для статуса published', () => {
    render(<StatusBadge status="published" />)
    expect(screen.getByText('Опубликована')).toBeDefined()
  })

  it('отображает "Отклонена" для статуса rejected', () => {
    render(<StatusBadge status="rejected" />)
    expect(screen.getByText('Отклонена')).toBeDefined()
  })

  it('применяет вариант bg-success для published', () => {
    const { container } = render(<StatusBadge status="published" />)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge?.className).toContain('bg-success')
  })

  it('применяет destructive вариант для rejected', () => {
    const { container } = render(<StatusBadge status="rejected" />)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge?.getAttribute('data-variant')).toBe('destructive')
  })
})
