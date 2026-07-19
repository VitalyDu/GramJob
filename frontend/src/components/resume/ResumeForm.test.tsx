import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResumeForm } from './ResumeForm'
import type { ResumeCreateInput, StrapiMedia } from '@/types/api'

vi.mock('@/components/resume/ResumePhotoUploader', () => ({
  ResumePhotoUploader: ({
    currentPhotoUrl,
    onUploadComplete,
    onRemove,
    disabled,
  }: {
    currentPhotoUrl: string | null
    onUploadComplete: (r: { id: number; url: string }) => void
    onRemove: () => void
    disabled?: boolean
  }) => (
    <div>
      {currentPhotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentPhotoUrl} alt="Photo preview" />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onUploadComplete({ id: 77, url: 'https://example.com/photo.png' })}
      >
        Симулировать загрузку фото
      </button>
      <button type="button" disabled={disabled} onClick={onRemove}>
        Удалить фото
      </button>
    </div>
  ),
}))

const baseDefaults: Partial<ResumeCreateInput> = {
  title: 'Senior Frontend Developer',
  firstName: 'Иван',
  lastName: 'Петров',
  country: 'RU',
  workFormat: ['remote'],
  employmentType: ['full-time'],
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

describe('ResumeForm — avatar upload', () => {
  it('отображает ResumePhotoUploader в форме', () => {
    render(<ResumeForm defaultValues={baseDefaults} onSubmit={vi.fn()} />)
    expect(screen.getByText('Симулировать загрузку фото')).toBeDefined()
  })

  it('включает avatar в данных сабмита после загрузки', async () => {
    const onSubmit = vi.fn()
    render(<ResumeForm defaultValues={baseDefaults} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByText('Симулировать загрузку фото'))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0]![0] as ResumeCreateInput
    expect(payload.avatar).toBe(77)
  })

  it('сбрасывает avatar на null при удалении', async () => {
    const onSubmit = vi.fn()
    render(
      <ResumeForm
        defaultValues={baseDefaults}
        defaultAvatar={{ id: 5, url: 'https://example.com/photo.png' } as StrapiMedia}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByText('Удалить фото'))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0]![0] as ResumeCreateInput
    expect(payload.avatar).toBeNull()
  })

  it('инициализирует превью из defaultAvatar', () => {
    render(
      <ResumeForm
        defaultValues={baseDefaults}
        defaultAvatar={{ id: 5, url: 'https://example.com/photo.png' } as StrapiMedia}
        onSubmit={vi.fn()}
      />
    )
    const img = screen.getByAltText('Photo preview') as HTMLImageElement
    expect(img).toBeDefined()
  })
})
