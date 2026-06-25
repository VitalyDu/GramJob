import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VacancyFilters } from './VacancyFilters'

describe('VacancyFilters', () => {
  it('отображает поле поиска', () => {
    render(<VacancyFilters params={{}} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/поиск/i)).toBeDefined()
  })

  it('отображает select для формата работы', () => {
    render(<VacancyFilters params={{}} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /формат/i })).toBeDefined()
  })

  it('отображает select для типа занятости', () => {
    render(<VacancyFilters params={{}} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /занятость/i })).toBeDefined()
  })

  it('отображает select для уровня', () => {
    render(<VacancyFilters params={{}} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /уровень/i })).toBeDefined()
  })

  it('отображает select для сортировки', () => {
    render(<VacancyFilters params={{}} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /сортировка/i })).toBeDefined()
  })

  it('вызывает onChange при сабмите формы', () => {
    const onChange = vi.fn()
    render(<VacancyFilters params={{}} onChange={onChange} />)
    fireEvent.submit(screen.getByRole('form'))
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('отражает начальное значение search в инпуте', () => {
    render(<VacancyFilters params={{ search: 'react' }} onChange={vi.fn()} />)
    const input = screen.getByPlaceholderText(/поиск/i) as HTMLInputElement
    expect(input.value).toBe('react')
  })

  it('отражает начальное значение workFormat в select', () => {
    render(<VacancyFilters params={{ workFormat: 'remote' }} onChange={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: /формат/i }) as HTMLSelectElement
    expect(select.value).toBe('remote')
  })
})
