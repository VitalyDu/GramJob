import { describe, it, expect } from 'vitest'
import {
  PLAN_LABELS,
  PLAN_COLORS,
  formatStarsPrice,
  canUpgradeToPlan,
  getPlanBadgeClasses,
} from './subscription-utils'

describe('PLAN_LABELS', () => {
  it('содержит метки для всех 4 планов', () => {
    expect(PLAN_LABELS.free).toBe('Free')
    expect(PLAN_LABELS.pro).toBe('Pro')
    expect(PLAN_LABELS.max).toBe('Max')
    expect(PLAN_LABELS.vip).toBe('VIP')
  })
})

describe('PLAN_COLORS', () => {
  it('free — зелёный', () => {
    expect(PLAN_COLORS.free).toBe('green')
  })
  it('pro — синий', () => {
    expect(PLAN_COLORS.pro).toBe('blue')
  })
  it('max — янтарный', () => {
    expect(PLAN_COLORS.max).toBe('amber')
  })
  it('vip — золотой', () => {
    expect(PLAN_COLORS.vip).toBe('yellow')
  })
})

describe('formatStarsPrice', () => {
  it('null → Бесплатно', () => {
    expect(formatStarsPrice(null)).toBe('Бесплатно')
  })
  it('299 → "299 ★"', () => {
    expect(formatStarsPrice(299)).toBe('299 ★')
  })
  it('1299 → "1299 ★"', () => {
    expect(formatStarsPrice(1299)).toBe('1299 ★')
  })
})

describe('canUpgradeToPlan', () => {
  it('pro можно купить с любого плана', () => {
    expect(canUpgradeToPlan('free', 'pro')).toBe(true)
    expect(canUpgradeToPlan('max', 'pro')).toBe(true)
    expect(canUpgradeToPlan('vip', 'pro')).toBe(true)
  })

  it('max можно купить с любого плана', () => {
    expect(canUpgradeToPlan('free', 'max')).toBe(true)
    expect(canUpgradeToPlan('pro', 'max')).toBe(true)
    expect(canUpgradeToPlan('vip', 'max')).toBe(true)
  })

  it('vip требует активный max или vip', () => {
    expect(canUpgradeToPlan('max', 'vip')).toBe(true)
    expect(canUpgradeToPlan('vip', 'vip')).toBe(true)
    expect(canUpgradeToPlan('pro', 'vip')).toBe(false)
    expect(canUpgradeToPlan('free', 'vip')).toBe(false)
  })

  it('free нельзя купить', () => {
    expect(canUpgradeToPlan('pro', 'free')).toBe(false)
    expect(canUpgradeToPlan('max', 'free')).toBe(false)
  })
})

describe('getPlanBadgeClasses', () => {
  it('free — зелёные классы', () => {
    const cls = getPlanBadgeClasses('free')
    expect(cls).toBe('bg-green-100 text-green-700')
  })
  it('vip — жёлтые классы', () => {
    const cls = getPlanBadgeClasses('vip')
    expect(cls).toContain('yellow')
  })
})
