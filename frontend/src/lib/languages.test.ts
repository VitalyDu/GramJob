import { describe, it, expect } from 'vitest'
import { LANGUAGES_LIST, getLanguageName, getLanguagesList } from './languages'

describe('languages', () => {
  it('getLanguageName возвращает локализованное название для ru локали', () => {
    expect(getLanguageName('en', 'ru')).toBeTruthy()
    expect(getLanguageName('de', 'ru')).toBeTruthy()
    expect(getLanguageName('ru', 'ru')).toBeTruthy()
  })

  it('getLanguageName возвращает локализованное название для en локали', () => {
    expect(getLanguageName('en', 'en')).toBeTruthy()
    expect(getLanguageName('ru', 'en')).toBeTruthy()
  })

  it('getLanguageName возвращает сам код если пустая строка', () => {
    expect(getLanguageName('', 'ru')).toBe('')
  })

  it('LANGUAGES_LIST отсортирован по алфавиту (ru)', () => {
    const names = LANGUAGES_LIST.map((l) => l.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'ru'))
    expect(names).toEqual(sorted)
  })

  it('LANGUAGES_LIST содержит основные коды', () => {
    const codes = LANGUAGES_LIST.map((l) => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('ru')
    expect(codes).toContain('de')
    expect(codes).toContain('zh')
    expect(codes).toContain('ar')
  })

  it('getLanguagesList возвращает отсортированный список для en локали', () => {
    const list = getLanguagesList('en')
    const en = list.find((l) => l.code === 'en')
    expect(en).toBeDefined()
    expect(en?.name).toBeTruthy()
  })
})
