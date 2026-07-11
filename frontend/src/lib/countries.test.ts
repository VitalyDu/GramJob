import { describe, it, expect } from 'vitest'
import { COUNTRIES_LIST, getCountryName, getCountriesList } from './countries'

describe('countries', () => {
  it('getCountryName возвращает локализованное название для RU локали', () => {
    expect(getCountryName('RU', 'ru')).toBeTruthy()
    expect(getCountryName('US', 'ru')).toBeTruthy()
    expect(getCountryName('DE', 'ru')).toBeTruthy()
  })

  it('getCountryName возвращает локализованное название для EN локали', () => {
    expect(getCountryName('US', 'en')).toBeTruthy()
    expect(getCountryName('DE', 'en')).toBeTruthy()
  })

  it('getCountryName возвращает сам код если не найден', () => {
    expect(getCountryName('XX', 'ru')).toBe('XX')
    expect(getCountryName('')).toBe('')
  })

  it('COUNTRIES_LIST отсортирован по алфавиту (ru)', () => {
    const names = COUNTRIES_LIST.map((c) => c.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'ru'))
    expect(names).toEqual(sorted)
  })

  it('COUNTRIES_LIST содержит стандартные коды', () => {
    const codes = COUNTRIES_LIST.map((c) => c.code)
    expect(codes).toContain('RU')
    expect(codes).toContain('US')
    expect(codes).toContain('AE')
    expect(codes).toContain('KZ')
  })

  it('COUNTRIES_LIST содержит объекты с code и name', () => {
    const ru = COUNTRIES_LIST.find((c) => c.code === 'RU')
    expect(ru).toBeDefined()
    expect(typeof ru?.name).toBe('string')
    expect(ru!.name.length).toBeGreaterThan(0)
  })

  it('getCountriesList возвращает список для EN локали', () => {
    const list = getCountriesList('en')
    const us = list.find((c) => c.code === 'US')
    expect(us).toBeDefined()
    expect(us?.name).toBeTruthy()
  })
})
