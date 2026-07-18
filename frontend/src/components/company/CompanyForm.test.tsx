import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompanyForm } from './CompanyForm'
import type { StrapiMedia } from '@/types/api'

vi.mock('@/components/company/LogoUploader', () => ({
  LogoUploader: ({
    currentLogoUrl,
    onUploadComplete,
    onRemove,
  }: {
    currentLogoUrl: string | null
    onUploadComplete: (r: { id: number; url: string }) => void
    onRemove: () => void
  }) => (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {currentLogoUrl && <img src={currentLogoUrl} alt="Logo preview" />}
      <button
        type="button"
        onClick={() => onUploadComplete({ id: 99, url: 'https://example.com/logo.png' })}
      >
        Симулировать загрузку
      </button>
      <button type="button" onClick={onRemove}>
        Удалить лого
      </button>
    </div>
  ),
}))

vi.mock('@/components/ui/country-select', () => ({
  CountrySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      aria-label="Страна"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={false}
    />
  ),
}))

vi.mock('@/components/ui/city-select', () => ({
  CitySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Город" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

describe('CompanyForm', () => {
  it('отображает поле названия компании', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/название/i)).toBeDefined()
  })

  it('отображает поле описания', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/описание/i)).toBeDefined()
  })

  it('отображает поле страны', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/страна/i)).toBeDefined()
  })

  it('отображает поле размера компании', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    expect(screen.getByText(/размер компании/i)).toBeDefined()
  })

  it('показывает ошибку если название пустое при submit', async () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))
    await waitFor(() => {
      expect(screen.getByText(/название обязательно/i)).toBeDefined()
    })
  })

  it('показывает ошибку если страна пустая при submit', async () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))
    await waitFor(() => {
      expect(screen.getByText(/страна обязательна/i)).toBeDefined()
    })
  })

  it('вызывает onSubmit с корректными данными', async () => {
    const onSubmit = vi.fn()
    render(<CompanyForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/название/i), {
      target: { value: 'Test Corp' },
    })

    fireEvent.change(screen.getByLabelText(/страна/i), {
      target: { value: 'DE' },
    })

    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Corp', country: 'DE' }),
        expect.anything()
      )
    })
  })

  it('заполняет форму defaultValues при редактировании', () => {
    render(
      <CompanyForm
        onSubmit={vi.fn()}
        defaultValues={{
          name: 'Existing Corp',
          description: 'Some desc',
          country: 'US',
          companySize: 'size_51_200',
        }}
      />
    )
    const nameInput = screen.getByLabelText(/название/i) as HTMLInputElement
    expect(nameInput.value).toBe('Existing Corp')
  })

  it('отображает isLoading на кнопке', () => {
    render(<CompanyForm onSubmit={vi.fn()} isLoading />)
    const button = screen.getByRole('button', { name: /сохранение/i })
    expect(button.hasAttribute('disabled')).toBe(true)
  })

  it('отображает LogoUploader в секции Основное', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    expect(screen.getByText('Симулировать загрузку')).toBeDefined()
  })

  it('включает logo в данных сабмита после загрузки', async () => {
    const onSubmit = vi.fn()
    render(<CompanyForm onSubmit={onSubmit} />)

    fireEvent.click(screen.getByText('Симулировать загрузку'))

    fireEvent.change(screen.getByLabelText(/название/i), { target: { value: 'Test Corp' } })
    fireEvent.change(screen.getByLabelText(/страна/i), { target: { value: 'DE' } })

    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Corp', logo: 99 }),
        expect.anything()
      )
    })
  })

  it('сбрасывает logo на null при удалении', async () => {
    const onSubmit = vi.fn()
    render(
      <CompanyForm
        onSubmit={onSubmit}
        defaultLogo={{ id: 5, url: '/existing.png' } as StrapiMedia}
      />
    )

    fireEvent.click(screen.getByText('Удалить лого'))

    fireEvent.change(screen.getByLabelText(/название/i), { target: { value: 'Test Corp' } })
    fireEvent.change(screen.getByLabelText(/страна/i), { target: { value: 'DE' } })

    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ logo: null }),
        expect.anything()
      )
    })
  })

  it('инициализирует превью логотипа из defaultLogo', () => {
    render(
      <CompanyForm
        onSubmit={vi.fn()}
        defaultLogo={{ id: 5, url: '/existing.png' } as StrapiMedia}
      />
    )
    const img = screen.getByAltText('Logo preview') as HTMLImageElement
    expect(img).toBeDefined()
  })
})
