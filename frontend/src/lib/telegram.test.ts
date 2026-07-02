import { describe, it, expect, afterEach, vi } from 'vitest'
import { parseStartParam, hapticImpact, hapticNotify, hapticSelection } from './telegram'

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

function mockTelegramHaptics() {
  const HapticFeedback = {
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    selectionChanged: vi.fn(),
  }
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: { initData: 'user=1', HapticFeedback },
  }
  return HapticFeedback
}

describe('haptic-хелперы', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
  })

  it('hapticImpact вызывает impactOccurred (по умолчанию light)', () => {
    const h = mockTelegramHaptics()
    hapticImpact()
    expect(h.impactOccurred).toHaveBeenCalledWith('light')
    hapticImpact('medium')
    expect(h.impactOccurred).toHaveBeenCalledWith('medium')
  })

  it('hapticNotify вызывает notificationOccurred', () => {
    const h = mockTelegramHaptics()
    hapticNotify('success')
    expect(h.notificationOccurred).toHaveBeenCalledWith('success')
  })

  it('hapticSelection вызывает selectionChanged', () => {
    const h = mockTelegramHaptics()
    hapticSelection()
    expect(h.selectionChanged).toHaveBeenCalledOnce()
  })

  it('вне Mini App — no-op без исключений', () => {
    expect(() => {
      hapticImpact()
      hapticNotify('error')
      hapticSelection()
    }).not.toThrow()
  })
})
