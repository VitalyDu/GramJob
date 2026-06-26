import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditVacancyClient } from './EditVacancyClient'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    vacancy: {
      currentVacancy: null,
      isLoading: true,
      error: null,
      fetchVacancyById: vi.fn(),
      updateVacancy: vi.fn(),
    },
    company: { myCompanies: [], fetchMyCompanies: vi.fn() },
  }),
}))

describe('EditVacancyClient', () => {
  it('показывает загрузку пока нет currentVacancy', () => {
    render(<EditVacancyClient id="vac1" />)
    expect(screen.getByText(/Загрузка/i)).toBeTruthy()
  })
})
