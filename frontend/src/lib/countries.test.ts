import { describe, it, expect } from 'vitest'
import { COUNTRIES, COUNTRIES_LIST, getCountryName } from './countries'

describe('countries', () => {
  it('getCountryName возвращает название для известного кода', () => {
    expect(getCountryName('RU')).toBe('Россия')
    expect(getCountryName('US')).toBe('США')
    expect(getCountryName('DE')).toBe('Германия')
  })

  it('getCountryName возвращает сам код если не найден', () => {
    expect(getCountryName('XX')).toBe('XX')
    expect(getCountryName('')).toBe('')
  })

  it('COUNTRIES_LIST отсортирован по алфавиту', () => {
    const names = COUNTRIES_LIST.map((c) => c.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'ru'))
    expect(names).toEqual(sorted)
  })

  it('COUNTRIES содержит стандартные коды', () => {
    expect(COUNTRIES).toHaveProperty('RU')
    expect(COUNTRIES).toHaveProperty('US')
    expect(COUNTRIES).toHaveProperty('AE')
    expect(COUNTRIES).toHaveProperty('KZ')
  })

  it('COUNTRIES_LIST содержит объекты с code и name', () => {
    const ru = COUNTRIES_LIST.find((c) => c.code === 'RU')
    expect(ru).toBeDefined()
    expect(ru?.name).toBe('Россия')
  })
})
