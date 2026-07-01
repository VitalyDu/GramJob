import { computeDelta, yesterdayUTC } from '../../src/services/analytics.service'

describe('computeDelta', () => {
  it('возвращает разницу', () => {
    expect(computeDelta(150, 130)).toBe(20)
  })

  it('возвращает 0 если дельта отрицательная', () => {
    expect(computeDelta(100, 150)).toBe(0)
  })

  it('возвращает текущее значение если нет предыдущей суммы', () => {
    expect(computeDelta(50, 0)).toBe(50)
  })
})

describe('yesterdayUTC', () => {
  it('возвращает строку в формате YYYY-MM-DD', () => {
    const result = yesterdayUTC()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('возвращает дату меньше сегодняшней', () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = yesterdayUTC()
    expect(yesterday < today).toBe(true)
  })
})
