import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResumeForm } from './ResumeForm'
import type { ResumeCreateInput } from '@/types/api'

const baseDefaults: Partial<ResumeCreateInput> = {
  title: 'Senior Frontend Developer',
  firstName: 'Иван',
  lastName: 'Петров',
  country: 'RU',
  workFormat: 'remote',
  employmentType: 'full-time',
}

describe('ResumeForm — languages (BUG-11)', () => {
  it('отображает языки из defaultValues', () => {
    render(
      <ResumeForm
        defaultValues={{
          ...baseDefaults,
          languages: [{ lang: 'Английский', level: 'B2' }],
        }}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByDisplayValue('Английский')).toBeInTheDocument()
    expect(screen.getByDisplayValue('B2')).toBeInTheDocument()
  })

  it('передаёт languages в payload при submit', async () => {
    const onSubmit = vi.fn()
    render(
      <ResumeForm
        defaultValues={{
          ...baseDefaults,
          languages: [
            { lang: 'Английский', level: 'B2' },
            { lang: 'Немецкий', level: 'A1' },
          ],
        }}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0]![0] as ResumeCreateInput
    expect(payload.languages).toEqual([
      { lang: 'Английский', level: 'B2' },
      { lang: 'Немецкий', level: 'A1' },
    ])
  })

  it('не отправляет languages, если строки пустые', async () => {
    const onSubmit = vi.fn()
    render(<ResumeForm defaultValues={baseDefaults} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0]![0] as ResumeCreateInput
    expect(payload.languages).toBeUndefined()
  })
})
