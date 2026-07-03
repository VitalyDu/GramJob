import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ApplicationDetailClient } from './ApplicationDetailClient'

const mockFetch = vi.fn()
const storeState: Record<string, unknown> = {}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
}))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ application: storeState }),
}))

vi.mock('@/hooks/useRequireAuth', () => ({ useRequireAuth: () => true }))

function setStore(overrides: Record<string, unknown>) {
  for (const key of Object.keys(storeState)) delete storeState[key]
  Object.assign(
    storeState,
    { isLoading: false, error: null, currentApplication: null, fetchApplicationById: mockFetch },
    overrides
  )
}

const app = {
  id: 1,
  documentId: 'app1',
  status: 'applied',
  coverLetter: 'Хочу к вам',
  createdAt: '2026-06-01T10:00:00.000Z',
  vacancy: {
    documentId: 'vac1',
    title: 'Frontend Developer',
    status: 'published',
    sourceType: 'internal',
    company: { documentId: 'c1', name: 'Acme Inc', slug: 'acme' },
  },
  resume: {
    documentId: 'res1',
    title: 'Senior Frontend',
    firstName: 'Иван',
    lastName: 'Петров',
    status: 'published',
  },
  user: { id: 7, firstName: 'Иван', lastName: 'Петров' },
}

describe('ApplicationDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('запрашивает отклик по documentId', () => {
    setStore({})
    render(<ApplicationDetailClient documentId="app1" />)
    expect(mockFetch).toHaveBeenCalledWith('app1')
  })

  it('рендерит вакансию, резюме, статус и сопроводительное письмо', () => {
    setStore({ currentApplication: app })
    render(<ApplicationDetailClient documentId="app1" />)
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
    expect(screen.getByText('Acme Inc')).toBeInTheDocument()
    expect(screen.getByText('Senior Frontend')).toBeInTheDocument()
    expect(screen.getByText('Хочу к вам')).toBeInTheDocument()
  })

  it('показывает ошибку', () => {
    setStore({ error: 'Not found' })
    render(<ApplicationDetailClient documentId="app1" />)
    expect(screen.getByText('Not found')).toBeInTheDocument()
  })
})
