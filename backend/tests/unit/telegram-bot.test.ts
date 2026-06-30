import {
  buildTelegramApiUrl,
  buildInvoicePayload,
  parseInvoicePayload,
} from '../../src/api/payment/services/telegram-bot'

describe('buildTelegramApiUrl', () => {
  it('строит URL с токеном и методом', () => {
    const url = buildTelegramApiUrl('mytoken123', 'createInvoiceLink')
    expect(url).toBe('https://api.telegram.org/botmytoken123/createInvoiceLink')
  })
})

describe('buildInvoicePayload / parseInvoicePayload', () => {
  it('subscription payload сериализуется и парсится', () => {
    const payload = buildInvoicePayload({ type: 'subscription', planCode: 'pro', userId: 42 })
    const parsed = parseInvoicePayload(payload)
    expect(parsed).toEqual({ type: 'subscription', planCode: 'pro', userId: 42 })
  })

  it('vacancy_pack payload сериализуется и парсится', () => {
    const payload = buildInvoicePayload({ type: 'vacancy_pack', packageId: 3, userId: 7 })
    const parsed = parseInvoicePayload(payload)
    expect(parsed).toEqual({ type: 'vacancy_pack', packageId: 3, userId: 7 })
  })

  it('apply_pack payload сериализуется и парсится', () => {
    const payload = buildInvoicePayload({ type: 'apply_pack', packageId: 1, userId: 5 })
    const parsed = parseInvoicePayload(payload)
    expect(parsed).toEqual({ type: 'apply_pack', packageId: 1, userId: 5 })
  })

  it('parseInvoicePayload бросает ошибку на невалидный JSON', () => {
    expect(() => parseInvoicePayload('not-json')).toThrow()
  })
})
