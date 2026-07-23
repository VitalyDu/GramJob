import { describe, it, expect } from 'vitest'
import { STARS_TO_USDT_RATE, calculateUsdtDisplayAmount, formatUsdt } from './ton'

describe('ton price', () => {
  it('rate is 0.013', () => expect(STARS_TO_USDT_RATE).toBe(0.013))
  it('299 stars → 3.887 USDT', () => expect(calculateUsdtDisplayAmount(299)).toBeCloseTo(3.887, 3))
  it('999 stars → 12.987 USDT', () =>
    expect(calculateUsdtDisplayAmount(999)).toBeCloseTo(12.987, 3))
  it('formatUsdt rounds to 2 decimals', () => expect(formatUsdt(3.887)).toBe('$3.89'))
})
