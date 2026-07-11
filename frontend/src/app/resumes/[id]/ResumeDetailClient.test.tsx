import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResumeDetailClient } from './ResumeDetailClient'
import type { Resume } from '@/types/api'

const resume: Partial<Resume> = {
  documentId: 'r1',
  title: 'Frontend Developer',
  firstName: 'Иван',
  lastName: 'Петров',
  country: 'RU',
  workFormat: ['remote'],
  employmentType: ['full-time'],
  moderationStatus: 'published',
  languages: [
    { lang: 'Английский', level: 'B2' },
    { lang: 'Немецкий', level: '' },
  ],
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    resume: {
      currentResume: resume,
      isLoading: false,
      error: null,
      accessDenied: false,
      fetchResumeById: vi.fn(),
    },
    auth: { user: null },
  }),
}))

describe('ResumeDetailClient — languages (BUG-11)', () => {
  it('рендерит блок языков с уровнями', () => {
    render(<ResumeDetailClient id="r1" />)

    expect(screen.getByText('Языки')).toBeInTheDocument()
    expect(screen.getByText('Английский — B2')).toBeInTheDocument()
    expect(screen.getByText('Немецкий')).toBeInTheDocument()
  })
})
