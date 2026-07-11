import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VacancyFilters } from './VacancyFilters'

vi.mock('@/services/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: [] }) },
}))

describe('VacancyFilters', () => {
  it('рендерит кнопку «Фильтры» на мобильном (md:hidden)', () => {
    render(<VacancyFilters params={{}} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /фильтры/i })).toBeInTheDocument()
  })

  it('показывает число активных фильтров на кнопке', () => {
    render(
      <VacancyFilters
        params={{ workFormat: ['remote'], seniority: ['senior'] }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /фильтры/i })).toHaveTextContent('2')
  })

  it('кнопка «Сбросить» вызывает onChange с { page: 1 }', async () => {
    const onChange = vi.fn()
    render(<VacancyFilters params={{ workFormat: ['remote'] }} onChange={onChange} />)
    await userEvent.click(screen.getAllByTestId('filters-reset')[0]!)
    expect(onChange).toHaveBeenCalledWith({ page: 1 })
  })
})
