import { describe, it, expect } from 'vitest'
import { getUsageColorClass } from './UsageLimitBar'

describe('getUsageColorClass', () => {
  it('0–50 % use → жёлтый', () => {
    expect(getUsageColorClass(0, 10)).toBe('bg-yellow-400')
    expect(getUsageColorClass(1, 10)).toBe('bg-yellow-400')
    expect(getUsageColorClass(4, 10)).toBe('bg-yellow-400')
    // ровно на границе 50 % уже уходит в оранжевый
    expect(getUsageColorClass(5, 10)).toBe('bg-orange-500')
  })

  it('50–80 % use → оранжевый', () => {
    expect(getUsageColorClass(5, 10)).toBe('bg-orange-500')
    expect(getUsageColorClass(6, 10)).toBe('bg-orange-500')
    expect(getUsageColorClass(7, 10)).toBe('bg-orange-500')
    // ровно 80 % уходит в красный
    expect(getUsageColorClass(8, 10)).toBe('bg-red-500')
  })

  it('80–100 % use → красный', () => {
    expect(getUsageColorClass(8, 10)).toBe('bg-red-500')
    expect(getUsageColorClass(9, 10)).toBe('bg-red-500')
    expect(getUsageColorClass(10, 10)).toBe('bg-red-500')
  })

  it('limit = 0 → жёлтый (нейтральное состояние)', () => {
    expect(getUsageColorClass(0, 0)).toBe('bg-yellow-400')
    expect(getUsageColorClass(5, 0)).toBe('bg-yellow-400')
  })

  it('used > limit не должно происходить (инвариант backend), но не падает', () => {
    expect(getUsageColorClass(15, 10)).toBe('bg-red-500')
  })
})
