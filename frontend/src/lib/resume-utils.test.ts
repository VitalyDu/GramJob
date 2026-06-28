import { describe, it, expect } from 'vitest'
import {
  RESUME_WORK_FORMAT_LABELS,
  RESUME_EMPLOYMENT_TYPE_LABELS,
  canPublishResume,
  canEditResume,
  canArchiveResume,
  APPLY_PLAN_LIMITS,
} from './resume-utils'

describe('RESUME_WORK_FORMAT_LABELS', () => {
  it('содержит метку для any', () => {
    expect(RESUME_WORK_FORMAT_LABELS['any']).toBe('Любой')
  })
  it('содержит метки для всех форматов', () => {
    expect(RESUME_WORK_FORMAT_LABELS['office']).toBe('Офис')
    expect(RESUME_WORK_FORMAT_LABELS['remote']).toBe('Удалённо')
    expect(RESUME_WORK_FORMAT_LABELS['hybrid']).toBe('Гибрид')
  })
})

describe('canPublishResume', () => {
  it('разрешает из draft и rejected', () => {
    expect(canPublishResume('draft')).toBe(true)
    expect(canPublishResume('rejected')).toBe(true)
  })
  it('запрещает из moderation, published, archived', () => {
    expect(canPublishResume('moderation')).toBe(false)
    expect(canPublishResume('published')).toBe(false)
    expect(canPublishResume('archived')).toBe(false)
  })
})

describe('canEditResume', () => {
  it('разрешает из draft, rejected, published', () => {
    expect(canEditResume('draft')).toBe(true)
    expect(canEditResume('rejected')).toBe(true)
    expect(canEditResume('published')).toBe(true)
  })
  it('запрещает из moderation и archived', () => {
    expect(canEditResume('moderation')).toBe(false)
    expect(canEditResume('archived')).toBe(false)
  })
})

describe('canArchiveResume', () => {
  it('разрешает из published, draft, rejected', () => {
    expect(canArchiveResume('published')).toBe(true)
    expect(canArchiveResume('draft')).toBe(true)
    expect(canArchiveResume('rejected')).toBe(true)
  })
  it('запрещает из moderation и archived', () => {
    expect(canArchiveResume('moderation')).toBe(false)
    expect(canArchiveResume('archived')).toBe(false)
  })
})

describe('APPLY_PLAN_LIMITS', () => {
  it('free имеет лимит 3', () => {
    expect(APPLY_PLAN_LIMITS['free']).toBe(3)
  })
  it('max и vip имеют лимит 50', () => {
    expect(APPLY_PLAN_LIMITS['max']).toBe(50)
    expect(APPLY_PLAN_LIMITS['vip']).toBe(50)
  })
})
