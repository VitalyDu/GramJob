import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResumeCard } from './ResumeCard'
import type { Resume } from '@/types/api'

const mockResume: Resume = {
  id: 1,
  documentId: 'res123',
  title: 'Frontend Developer',
  firstName: 'Иван',
  lastName: 'Петров',
  country: 'RU',
  city: 'Москва',
  workFormat: 'remote',
  employmentType: 'full-time',
  experienceYears: 3,
  skills: ['React', 'TypeScript', 'CSS', 'Node.js', 'GraphQL', 'Docker'],
  status: 'published',
  createdAt: '2026-01-01T00:00:00Z',
}

describe('ResumeCard', () => {
  it('отображает заголовок резюме', () => {
    render(<ResumeCard resume={mockResume} />)
    expect(screen.getByText('Frontend Developer')).toBeDefined()
  })

  it('отображает имя кандидата', () => {
    render(<ResumeCard resume={mockResume} />)
    expect(screen.getByText('Иван Петров')).toBeDefined()
  })

  it('отображает страну и город через запятую', () => {
    render(<ResumeCard resume={mockResume} />)
    expect(screen.getByText('RU, Москва')).toBeDefined()
  })

  it('отображает формат работы', () => {
    render(<ResumeCard resume={mockResume} />)
    expect(screen.getByText('Удалённо')).toBeDefined()
  })

  it('отображает тип занятости', () => {
    render(<ResumeCard resume={mockResume} />)
    expect(screen.getByText('Полная занятость')).toBeDefined()
  })

  it('отображает первые 5 навыков и счётчик остальных', () => {
    render(<ResumeCard resume={mockResume} />)
    expect(screen.getByText('React')).toBeDefined()
    expect(screen.getByText('TypeScript')).toBeDefined()
    expect(screen.getByText('CSS')).toBeDefined()
    expect(screen.getByText('Node.js')).toBeDefined()
    expect(screen.getByText('GraphQL')).toBeDefined()
    expect(screen.getByText('+1')).toBeDefined()
  })

  it('отображает статусный бейдж', () => {
    render(<ResumeCard resume={mockResume} />)
    expect(screen.getByText('Опубликовано')).toBeDefined()
  })

  it('отображает инициалы в аватаре', () => {
    render(<ResumeCard resume={mockResume} />)
    expect(screen.getByText('ИП')).toBeDefined()
  })

  it('рендерит ссылку на страницу резюме', () => {
    const { container } = render(<ResumeCard resume={mockResume} />)
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/resumes/res123')
  })

  it('рендерит карточку с hover-эффектом', () => {
    const { container } = render(<ResumeCard resume={mockResume} />)
    const link = container.querySelector('a')
    expect(link?.className).toContain('group')
  })

  it('отображает только страну если город не задан', () => {
    const noCity: Resume = { ...mockResume, city: null }
    render(<ResumeCard resume={noCity} />)
    expect(screen.getByText('RU')).toBeDefined()
  })

  it('не падает если skills не заданы', () => {
    const noSkills: Resume = { ...mockResume, skills: null }
    render(<ResumeCard resume={noSkills} />)
    expect(screen.getByText('Frontend Developer')).toBeDefined()
  })
})
