import { describe, it, expect, afterEach, vi } from 'vitest'
import { applyTelegramTheme } from './telegram-theme'
import type { TelegramWebApp } from './telegram'

function makeTwa(overrides: Partial<TelegramWebApp> = {}): TelegramWebApp {
  return {
    colorScheme: 'light',
    themeParams: {},
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    ...overrides,
  } as unknown as TelegramWebApp
}

describe('applyTelegramTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style')
    document.documentElement.classList.remove('dark')
  })

  it('маппит themeParams на shadcn CSS-переменные', () => {
    applyTelegramTheme(
      makeTwa({
        themeParams: {
          bg_color: '#ffffff',
          text_color: '#111111',
          button_color: '#2481cc',
          hint_color: '#999999',
        },
      })
    )
    const style = document.documentElement.style
    expect(style.getPropertyValue('--background')).toBe('#ffffff')
    expect(style.getPropertyValue('--foreground')).toBe('#111111')
    expect(style.getPropertyValue('--primary')).toBe('#2481cc')
    expect(style.getPropertyValue('--muted-foreground')).toBe('#999999')
  })

  it('пропускает отсутствующие параметры', () => {
    applyTelegramTheme(makeTwa({ themeParams: { text_color: '#222222' } }))
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('')
  })

  it('ставит класс dark при colorScheme=dark и снимает при light', () => {
    const dark = makeTwa({ colorScheme: 'dark' })
    applyTelegramTheme(dark)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTelegramTheme(makeTwa({ colorScheme: 'light' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('вызывает setHeaderColor и setBackgroundColor цветом bg_color', () => {
    const twa = makeTwa({ themeParams: { bg_color: '#1c1c1d' } })
    applyTelegramTheme(twa)
    expect(twa.setHeaderColor).toHaveBeenCalledWith('#1c1c1d')
    expect(twa.setBackgroundColor).toHaveBeenCalledWith('#1c1c1d')
  })
})
