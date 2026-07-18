import { getUsedToday, tryConsumeDaily, refundDaily } from '../../src/services/daily-limits'

function makeStrapi(rows: unknown[][]) {
  const raw = jest.fn()
  for (const returned of rows) raw.mockResolvedValueOnce({ rows: returned })
  return {
    db: { connection: { raw } },
  } as any
}

describe('daily-limits', () => {
  describe('getUsedToday', () => {
    it('returns 0 when user has no counter', async () => {
      const strapi = makeStrapi([[{ count: 0 }]])
      const used = await getUsedToday(strapi, 'apply', 42)
      expect(used).toBe(0)
    })

    it('returns 5 when apply counter says 5 today', async () => {
      const strapi = makeStrapi([[{ count: 5 }]])
      const used = await getUsedToday(strapi, 'apply', 42)
      expect(used).toBe(5)
    })

    it('uses boost column when kind=boost', async () => {
      const strapi = makeStrapi([[{ count: 2 }]])
      await getUsedToday(strapi, 'boost', 42)
      const call = strapi.db.connection.raw.mock.calls[0]
      expect(call[0]).toContain('daily_boost_count')
      expect(call[0]).toContain('daily_boost_date')
    })
  })

  describe('tryConsumeDaily', () => {
    it('returns new count when UPDATE affected a row (under limit)', async () => {
      const strapi = makeStrapi([[{ new_count: 3 }]])
      const result = await tryConsumeDaily(strapi, 'apply', 42, 10)
      expect(result).toBe(3)
    })

    it('returns null when UPDATE affected 0 rows (limit reached)', async () => {
      const strapi = makeStrapi([[]])
      const result = await tryConsumeDaily(strapi, 'apply', 42, 3)
      expect(result).toBeNull()
    })

    it('passes limit as second parameter', async () => {
      const strapi = makeStrapi([[{ new_count: 1 }]])
      await tryConsumeDaily(strapi, 'boost', 99, 50)
      const call = strapi.db.connection.raw.mock.calls[0]
      expect(call[1]).toEqual([99, 50])
    })

    it('uses CASE WHEN date = CURRENT_DATE for reset semantics', async () => {
      const strapi = makeStrapi([[{ new_count: 1 }]])
      await tryConsumeDaily(strapi, 'apply', 1, 10)
      expect(strapi.db.connection.raw.mock.calls[0][0]).toContain('CURRENT_DATE')
    })
  })

  describe('refundDaily', () => {
    it('issues UPDATE ... GREATEST count-1 for CURRENT_DATE', async () => {
      const strapi = makeStrapi([[]])
      await refundDaily(strapi, 'apply', 42)
      const call = strapi.db.connection.raw.mock.calls[0]
      expect(call[0]).toContain('GREATEST')
      expect(call[0]).toContain('daily_apply_count')
      expect(call[1]).toEqual([42])
    })
  })
})
