import { describe, expect, it } from 'vitest'
import { detectLanguage } from './detect-language'

describe('detectLanguage', () => {
  it('возвращает сохранённый язык, если он валиден', () => {
    expect(detectLanguage({ stored: 'en', telegramLangCode: 'ru', navigatorLang: 'ru-RU' })).toBe(
      'en'
    )
  })

  it('игнорирует невалидное сохранённое значение', () => {
    expect(detectLanguage({ stored: 'de', telegramLangCode: 'ru', navigatorLang: 'en-US' })).toBe(
      'ru'
    )
  })

  it('использует язык Telegram, если localStorage пуст', () => {
    expect(detectLanguage({ stored: null, telegramLangCode: 'ru', navigatorLang: 'en-US' })).toBe(
      'ru'
    )
  })

  it('неподдерживаемый язык Telegram → en', () => {
    expect(detectLanguage({ stored: null, telegramLangCode: 'uk', navigatorLang: 'ru-RU' })).toBe(
      'en'
    )
  })

  it('без Telegram использует язык браузера', () => {
    expect(
      detectLanguage({ stored: null, telegramLangCode: undefined, navigatorLang: 'ru-RU' })
    ).toBe('ru')
    expect(
      detectLanguage({ stored: null, telegramLangCode: undefined, navigatorLang: 'de-DE' })
    ).toBe('en')
  })

  it('без каких-либо источников → en', () => {
    expect(
      detectLanguage({ stored: null, telegramLangCode: undefined, navigatorLang: undefined })
    ).toBe('en')
  })
})
