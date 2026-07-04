import { describe, it, expect } from 'vitest'
import { stripLeadingEmoji } from './notification-utils'

describe('stripLeadingEmoji', () => {
  it('срезает ведущее эмодзи и пробел', () => {
    expect(stripLeadingEmoji('📩 Новый отклик на «X»')).toBe('Новый отклик на «X»')
  })

  it('срезает эмодзи с variation selector', () => {
    expect(stripLeadingEmoji('⚠️ Ваша подписка Pro истекает')).toBe('Ваша подписка Pro истекает')
  })

  it('не трогает текст без эмодзи', () => {
    expect(stripLeadingEmoji('Обычный текст')).toBe('Обычный текст')
  })

  it('не трогает эмодзи в середине текста', () => {
    expect(stripLeadingEmoji('Текст с 🔥 внутри')).toBe('Текст с 🔥 внутри')
  })
})
