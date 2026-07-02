import { describe, it, expect } from 'vitest'
import { parseStartParam } from './telegram'

describe('parseStartParam', () => {
  it('vacancy_{documentId} → /vacancies/{documentId}', () => {
    expect(parseStartParam('vacancy_abc123XYZ')).toBe('/vacancies/abc123XYZ')
  })

  it('application_{documentId} → /dashboard/applications/{documentId}', () => {
    expect(parseStartParam('application_q1w2e3')).toBe('/dashboard/applications/q1w2e3')
  })

  it('subscription → /subscription', () => {
    expect(parseStartParam('subscription')).toBe('/subscription')
  })

  it('возвращает null для неизвестного формата', () => {
    expect(parseStartParam('unknown_thing')).toBeNull()
    expect(parseStartParam('vacancy_')).toBeNull()
    expect(parseStartParam('vacancy')).toBeNull()
  })

  it('возвращает null для пустого значения', () => {
    expect(parseStartParam(undefined)).toBeNull()
    expect(parseStartParam(null)).toBeNull()
    expect(parseStartParam('')).toBeNull()
  })

  it('отклоняет id с недопустимыми символами (path traversal)', () => {
    expect(parseStartParam('vacancy_../../etc')).toBeNull()
    expect(parseStartParam('application_a/b')).toBeNull()
  })
})
