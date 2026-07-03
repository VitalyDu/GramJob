import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VacancyFilters } from './VacancyFilters'

describe('VacancyFilters', () => {
  it('рендерит строку поиска и кнопку «Фильтры» (mobile-триггер)', () => {
    render(<VacancyFilters params={{}} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/поиск/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /фильтры/i })).toBeInTheDocument()
  })

  it('отправляет поиск через onChange с page: 1', async () => {
    const onChange = vi.fn()
    render(<VacancyFilters params={{}} onChange={onChange} />)
    await userEvent.type(screen.getByPlaceholderText(/поиск/i), 'react')
    await userEvent.click(screen.getAllByRole('button', { name: /найти/i })[0]!)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'react', page: 1 }))
  })

  it('показывает число активных фильтров на кнопке', () => {
    render(
      <VacancyFilters params={{ workFormat: 'remote', seniority: 'senior' }} onChange={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /фильтры/i })).toHaveTextContent('2')
  })

  it('кнопка «Сбросить» очищает фильтры', async () => {
    const onChange = vi.fn()
    render(<VacancyFilters params={{ workFormat: 'remote' }} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: /сбросить/i })[0]!)
    expect(onChange).toHaveBeenCalledWith({ page: 1 })
  })

  it('отражает начальное значение search в инпуте', () => {
    render(<VacancyFilters params={{ search: 'react' }} onChange={vi.fn()} />)
    const input = screen.getByPlaceholderText(/поиск/i) as HTMLInputElement
    expect(input.value).toBe('react')
  })
})
