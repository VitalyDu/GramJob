import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreateVacancyClient } from './CreateVacancyClient'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    vacancy: {
      isLoading: false,
      error: null,
      limitReached: false,
      createVacancy: vi.fn(),
      clearLimitReached: vi.fn(),
    },
    company: { myCompanies: [], isLoading: false, fetchMyCompanies: vi.fn() },
  }),
}))

describe('CreateVacancyClient', () => {
  it('отображает форму создания вакансии', () => {
    render(<CreateVacancyClient />)
    expect(screen.getByText(/Новая вакансия/)).toBeTruthy()
  })

  it('содержит кнопку отправки на модерацию', () => {
    render(<CreateVacancyClient />)
    expect(screen.getByText('Отправить на модерацию')).toBeTruthy()
  })
})
