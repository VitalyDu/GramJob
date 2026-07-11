import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultiSelect } from './multi-select'

const OPTIONS = [
  { value: 'remote', label: 'Удалённо' },
  { value: 'office', label: 'Офис' },
  { value: 'hybrid', label: 'Гибрид' },
]

describe('MultiSelect', () => {
  it('показывает placeholder, когда ничего не выбрано', () => {
    render(<MultiSelect label="Все форматы" options={OPTIONS} value={[]} onChange={vi.fn()} />)
    const input = screen.getByPlaceholderText('Все форматы')
    expect(input).toBeDefined()
  })

  it('показывает чип с label выбранного значения при одном выбранном', () => {
    render(
      <MultiSelect label="Все форматы" options={OPTIONS} value={['office']} onChange={vi.fn()} />
    )
    expect(screen.getByText('Офис')).toBeDefined()
  })

  it('показывает отдельные чипы для каждого выбранного значения', () => {
    render(
      <MultiSelect
        label="Все форматы"
        options={OPTIONS}
        value={['remote', 'office']}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Удалённо')).toBeDefined()
    expect(screen.getByText('Офис')).toBeDefined()
  })

  it('рендерит чипы с кнопками удаления для каждого выбранного значения', () => {
    render(
      <MultiSelect
        label="Все форматы"
        options={OPTIONS}
        value={['remote', 'office']}
        onChange={vi.fn()}
      />
    )
    const chips = document.querySelectorAll('[data-slot="combobox-chip"]')
    expect(chips).toHaveLength(2)
  })
})
