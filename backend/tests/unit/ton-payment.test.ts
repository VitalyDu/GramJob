import {
  STARS_TO_USDT_RATE,
  calculateUsdtNanoAmount,
  generateIntentId,
  isValidIntentId,
} from '../../src/api/payment/services/ton-payment'

describe('ton-payment: rate & amount', () => {
  it('exports 0.013 as STARS_TO_USDT_RATE', () => {
    expect(STARS_TO_USDT_RATE).toBe(0.013)
  })

  it('calculates 299 stars → 3_887_000 USDT nano (299 * 0.013 * 1e6 = 3_887_000)', () => {
    expect(calculateUsdtNanoAmount(299)).toBe(BigInt(3_887_000))
  })

  it('calculates 999 stars → 12_987_000 USDT nano', () => {
    expect(calculateUsdtNanoAmount(999)).toBe(BigInt(12_987_000))
  })

  it('rounds fractional cents to integer nano', () => {
    // 100 stars * 0.013 = 1.3 USDT = 1_300_000 nano
    expect(calculateUsdtNanoAmount(100)).toBe(BigInt(1_300_000))
  })

  it('throws on non-positive stars', () => {
    expect(() => calculateUsdtNanoAmount(0)).toThrow()
    expect(() => calculateUsdtNanoAmount(-1)).toThrow()
  })
})

describe('ton-payment: intent id', () => {
  it('generateIntentId returns UUID-like string, isValidIntentId accepts it', () => {
    const id = generateIntentId()
    expect(id).toMatch(/^gj-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(isValidIntentId(id)).toBe(true)
  })

  it('rejects arbitrary strings', () => {
    expect(isValidIntentId('random')).toBe(false)
    expect(isValidIntentId('')).toBe(false)
    expect(isValidIntentId('gj-not-a-uuid')).toBe(false)
  })
})
