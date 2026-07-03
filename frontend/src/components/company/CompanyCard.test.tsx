import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompanyCard } from './CompanyCard'
import type { Company } from '@/types/api'

const mockCompany: Company = {
  id: 1,
  documentId: 'abc123',
  name: 'Acme Corp',
  slug: 'acme-corp',
  country: 'RU',
  city: 'Москва',
  companySize: 'size_11_50',
  status: 'published',
  logo: null,
  cover: null,
  owner: null,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('CompanyCard', () => {
  it('отображает название компании', () => {
    render(<CompanyCard company={mockCompany} />)
    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('отображает страну', () => {
    render(<CompanyCard company={mockCompany} />)
    expect(screen.getByText('RU')).toBeDefined()
  })

  it('отображает размер компании в читаемом формате', () => {
    render(<CompanyCard company={mockCompany} />)
    expect(screen.getByText('11–50')).toBeDefined()
  })

  it('рендерит плейсхолдер если logo null', () => {
    const { container } = render(<CompanyCard company={mockCompany} />)
    const img = container.querySelector('img')
    expect(img).toBeNull()
  })

  it('рендерит img если logo задан', () => {
    const withLogo: Company = {
      ...mockCompany,
      logo: {
        id: 1,
        documentId: 'img1',
        name: 'logo.png',
        url: '/uploads/logo.png',
      },
    }
    const { container } = render(<CompanyCard company={withLogo} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('Acme Corp')
  })

  it('рендерит ссылку на страницу компании', () => {
    const { container } = render(<CompanyCard company={mockCompany} />)
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/companies/abc123')
  })

  it('рендерит карточку с hover-эффектом', () => {
    const { container } = render(<CompanyCard company={mockCompany} />)
    const link = container.querySelector('a')
    expect(link?.className).toContain('group')
  })
})
