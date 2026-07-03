import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultiSelect } from './multi-select'

const OPTIONS = [
  { value: 'remote', label: 'Удалённо' },
  { value: 'office', label: 'Офис' },
  { value: 'hybrid', label: 'Гибрид' },
]

describe('MultiSelect', () => {
  it('показывает label, когда ничего не выбрано', () => {
    render(<MultiSelect label="Все форматы" options={OPTIONS} value={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox').textContent).toContain('Все форматы')
  })

  it('показывает label выбранного значения при одном выбранном', () => {
    render(
      <MultiSelect label="Все форматы" options={OPTIONS} value={['office']} onChange={vi.fn()} />
    )
    expect(screen.getByRole('combobox').textContent).toContain('Офис')
  })

  it('перечисляет выбранные значения через запятую при нескольких выбранных', () => {
    render(
      <MultiSelect
        label="Все форматы"
        options={OPTIONS}
        value={['remote', 'office']}
        onChange={vi.fn()}
      />
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger.textContent).toContain('Удалённо, Офис')
    expect(trigger.textContent).not.toContain('Все форматы:')
  })

  it('сохраняет каунтер при нескольких выбранных', () => {
    render(
      <MultiSelect
        label="Все форматы"
        options={OPTIONS}
        value={['remote', 'office']}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('2')).toBeDefined()
  })
})
