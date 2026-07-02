import { describe, it, expect } from 'vitest'
import { REJECTION_REASONS, getRejectionReasonKey } from './moderation-utils'
import ruCommon from '@/locales/ru/common.json'
import enCommon from '@/locales/en/common.json'

describe('moderation-utils', () => {
  it('содержит все 8 причин', () => {
    expect(REJECTION_REASONS).toHaveLength(8)
  })

  it('возвращает i18n-ключ для известной причины', () => {
    expect(getRejectionReasonKey('spam')).toBe('moderation.reasons.spam')
    expect(getRejectionReasonKey('incomplete')).toBe('moderation.reasons.incomplete')
  })

  it('возвращает ключ для "other"', () => {
    expect(getRejectionReasonKey('other')).toBe('moderation.reasons.other')
  })

  it('возвращает fallback-ключ для неизвестной причины', () => {
    expect(getRejectionReasonKey('unknown_reason')).toBe('moderation.reasons.unknown')
  })

  it('возвращает fallback-ключ для null и undefined', () => {
    expect(getRejectionReasonKey(null)).toBe('moderation.reasons.unknown')
    expect(getRejectionReasonKey(undefined)).toBe('moderation.reasons.unknown')
  })

  it('локали ru и en содержат переводы для всех причин', () => {
    for (const locale of [ruCommon, enCommon]) {
      const reasons = locale.moderation.reasons as Record<string, string>
      for (const reason of [...REJECTION_REASONS, 'unknown']) {
        expect(reasons[reason], `missing translation for ${reason}`).toBeTruthy()
      }
    }
  })
})
