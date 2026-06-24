import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VacancyCard } from './VacancyCard'
import type { Vacancy } from '@/types/api'

const mockVacancy: Vacancy = {
  id: 1,
  documentId: 'vac123',
  title: 'Senior Frontend Developer',
  country: 'RU',
  city: 'Москва',
  workFormat: 'remote',
  employmentType: 'full-time',
  seniority: 'senior',
  sourceType: 'internal',
  highlighted: false,
  urgent: false,
  topPlacement: false,
  status: 'published',
  createdAt: '2026-01-01T00:00:00Z',
  industry: { documentId: 'ind1', slug: 'it', name: { ru: 'IT', en: 'IT' } },
  specialization: {
    documentId: 'spec1',
    slug: 'frontend',
    name: { ru: 'Фронтенд', en: 'Frontend' },
  },
  company: { documentId: 'comp1', name: 'Acme Corp', slug: 'acme-corp', logo: null },
}

describe('VacancyCard', () => {
  it('отображает название вакансии', () => {
    render(<VacancyCard vacancy={mockVacancy} />)
    expect(screen.getByText('Senior Frontend Developer')).toBeDefined()
  })

  it('отображает название компании', () => {
    render(<VacancyCard vacancy={mockVacancy} />)
    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('отображает формат работы', () => {
    render(<VacancyCard vacancy={mockVacancy} />)
    expect(screen.getByText('Удалённо')).toBeDefined()
  })

  it('отображает тип занятости', () => {
    render(<VacancyCard vacancy={mockVacancy} />)
    expect(screen.getByText('Полная занятость')).toBeDefined()
  })

  it('отображает уровень senior', () => {
    render(<VacancyCard vacancy={mockVacancy} />)
    expect(screen.getByText('Senior')).toBeDefined()
  })

  it('отображает страну', () => {
    render(<VacancyCard vacancy={mockVacancy} />)
    expect(screen.getByText('RU')).toBeDefined()
  })

  it('отображает VacancyStatusBadge', () => {
    render(<VacancyCard vacancy={mockVacancy} />)
    expect(screen.getByText('Опубликована')).toBeDefined()
  })

  it('отображает зарплату если задана', () => {
    render(
      <VacancyCard
        vacancy={{ ...mockVacancy, salaryFrom: 5000, salaryTo: 8000, salaryCurrency: 'USD' }}
      />
    )
    expect(screen.getByText(/5\s*000/)).toBeDefined()
    expect(screen.getByText(/8\s*000/)).toBeDefined()
  })

  it('не отображает зарплату если не задана', () => {
    const { container } = render(<VacancyCard vacancy={mockVacancy} />)
    expect(container.textContent).not.toContain('$')
  })

  it('отображает бейдж Urgent если urgent=true', () => {
    render(<VacancyCard vacancy={{ ...mockVacancy, urgent: true }} />)
    expect(screen.getByText('Urgent')).toBeDefined()
  })

  it('не отображает бейдж Urgent если urgent=false', () => {
    render(<VacancyCard vacancy={mockVacancy} />)
    expect(screen.queryByText('Urgent')).toBeNull()
  })

  it('рендерит ссылку на страницу вакансии', () => {
    const { container } = render(<VacancyCard vacancy={mockVacancy} />)
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/vacancies/vac123')
  })
})
