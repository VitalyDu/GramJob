import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LimitBar } from './LimitBar'

describe('LimitBar', () => {
  it('отображает количество использованных и доступных вакансий', () => {
    render(<LimitBar used={2} limit={3} />)
    expect(screen.getByText(/2/)).toBeDefined()
    expect(screen.getByText(/3/)).toBeDefined()
  })

  it('рендерит прогресс-бар', () => {
    const { container } = render(<LimitBar used={1} limit={3} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
  })

  it('ширина прогресс-бара соответствует заполненности', () => {
    const { container } = render(<LimitBar used={1} limit={4} />)
    const fill = container.querySelector('[data-fill]')
    expect(fill?.getAttribute('style')).toContain('25%')
  })

  it('применяет зелёный цвет при использовании < 50%', () => {
    const { container } = render(<LimitBar used={1} limit={10} />)
    const fill = container.querySelector('[data-fill]')
    expect(fill?.className).toContain('green')
  })

  it('применяет жёлтый цвет при использовании 50–79%', () => {
    const { container } = render(<LimitBar used={6} limit={10} />)
    const fill = container.querySelector('[data-fill]')
    expect(fill?.className).toContain('yellow')
  })

  it('применяет красный цвет при использовании ≥ 80%', () => {
    const { container } = render(<LimitBar used={9} limit={10} />)
    const fill = container.querySelector('[data-fill]')
    expect(fill?.className).toContain('red')
  })

  it('корректно обрабатывает limit=0 без деления на ноль', () => {
    expect(() => render(<LimitBar used={0} limit={0} />)).not.toThrow()
  })

  it('не превышает 100% если used > limit', () => {
    const { container } = render(<LimitBar used={5} limit={3} />)
    const fill = container.querySelector('[data-fill]')
    expect(fill?.getAttribute('style')).toContain('100%')
  })
})
