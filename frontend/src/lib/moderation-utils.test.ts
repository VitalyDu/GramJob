import { describe, it, expect } from 'vitest'
import { REJECTION_REASON_LABELS, getRejectionReasonLabel } from './moderation-utils'

describe('moderation-utils', () => {
  it('содержит метки для всех 8 причин', () => {
    expect(Object.keys(REJECTION_REASON_LABELS)).toHaveLength(8)
  })

  it('возвращает метку для известной причины', () => {
    expect(getRejectionReasonLabel('spam')).toBe('Спам или дублирующийся контент')
    expect(getRejectionReasonLabel('incomplete')).toBe('Недостаточно информации')
  })

  it('возвращает метку для "other"', () => {
    expect(getRejectionReasonLabel('other')).toBe('Другое')
  })

  it('возвращает fallback для неизвестной причины', () => {
    expect(getRejectionReasonLabel('unknown_reason')).toBe('См. комментарий модератора')
  })

  it('возвращает fallback для null и undefined', () => {
    expect(getRejectionReasonLabel(null)).toBe('См. комментарий модератора')
    expect(getRejectionReasonLabel(undefined)).toBe('См. комментарий модератора')
  })
})
