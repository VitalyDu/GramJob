import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompanyForm } from './CompanyForm'

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
    expect(screen.getByText('Выберите страну')).toBeDefined()
  })

  it('отображает поле размера компании', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/размер/i)).toBeDefined()
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
    render(<CompanyForm onSubmit={onSubmit} defaultValues={{ country: 'RU' }} />)

    fireEvent.change(screen.getByLabelText(/название/i), {
      target: { value: 'Test Corp' },
    })

    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Corp', country: 'RU' }),
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
    const button = screen.getByRole('button')
    expect(button.hasAttribute('disabled')).toBe(true)
  })
})
