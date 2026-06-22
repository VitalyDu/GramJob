import { buildRateLimitOptions } from '../../src/middlewares/rate-limit'

describe('buildRateLimitOptions', () => {
  it('returns config with correct default values', () => {
    const config = buildRateLimitOptions({})
    expect(config.max).toBe(100)
    expect(config.duration).toBe(60000)
    expect(config.errorMessage).toBeDefined()
  })

  it('allows overriding max', () => {
    const config = buildRateLimitOptions({ max: 10 })
    expect(config.max).toBe(10)
  })

  it('allows overriding duration', () => {
    const config = buildRateLimitOptions({ duration: 30000 })
    expect(config.duration).toBe(30000)
  })

  it('uses memory driver by default', () => {
    const config = buildRateLimitOptions({})
    expect(config.driver).toBe('memory')
  })

  it('uses different db instances to avoid cross-limit interference', () => {
    const configA = buildRateLimitOptions({ max: 10 })
    const configB = buildRateLimitOptions({ max: 100 })
    expect(configA.db).not.toBe(configB.db)
  })
})
