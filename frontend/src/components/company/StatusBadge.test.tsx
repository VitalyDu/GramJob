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

  it('применяет зелёный класс для published', () => {
    const { container } = render(<StatusBadge status="published" />)
    expect(container.firstChild?.toString()).not.toBe(null)
    const span = container.querySelector('span')
    expect(span?.className).toContain('green')
  })

  it('применяет красный класс для rejected', () => {
    const { container } = render(<StatusBadge status="rejected" />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('red')
  })
})
