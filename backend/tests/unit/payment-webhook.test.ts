/**
 * S2: Telegram webhook не применяет urgent/top_placement к вакансии,
 * которая перестала быть опубликованной после создания инвойса.
 *
 * L4: Уведомление отправляется при статусе hired.
 */

const mockActivateSubscription = jest.fn()
const mockAddCredits = jest.fn()
const mockSendNotification = jest.fn()
const mockAnswerPreCheckoutQuery = jest.fn()

jest.mock('../../src/api/payment/services/subscription-service', () => ({
  activateSubscription: mockActivateSubscription,
  addCredits: mockAddCredits,
}))
jest.mock('../../src/services/notification.service', () => ({
  sendNotification: mockSendNotification,
}))
jest.mock('../../src/api/payment/services/telegram-bot', () => {
  const actual = jest.requireActual('../../src/api/payment/services/telegram-bot')
  return {
    answerPreCheckoutQuery: mockAnswerPreCheckoutQuery,
    parseInvoicePayload: actual.parseInvoicePayload,
    buildInvoicePayload: actual.buildInvoicePayload,
  }
})

import webhookController from '../../src/api/payment/controllers/telegram-webhook'

function makePaymentStrapi(vacancyStatus: string) {
  const docUpdate = jest.fn().mockResolvedValue({})
  const docFindOne = jest
    .fn()
    .mockResolvedValue({ documentId: 'vac1', moderationStatus: vacancyStatus })
  const packFindOne = jest.fn().mockResolvedValue({ vacancyCredits: 10, boostCredits: 5 })
  const paymentCreate = jest.fn().mockResolvedValue({ id: 1 })
  const paymentFindOne = jest.fn().mockResolvedValue(null)
  const paymentUpdate = jest.fn().mockResolvedValue({})

  return {
    documents: jest.fn().mockReturnValue({ findOne: docFindOne, update: docUpdate }),
    db: {
      query: jest.fn().mockImplementation((model: string) => {
        if (model === 'api::payment.payment') {
          return { create: paymentCreate, findOne: paymentFindOne, update: paymentUpdate }
        }
        if (model === 'api::vacancy-package.vacancy-package') return { findOne: packFindOne }
        return { findOne: jest.fn(), update: jest.fn() }
      }),
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    _docUpdate: docUpdate,
    _paymentUpdate: paymentUpdate,
  } as any
}

function makeCtx(payload: object, secret = 'test-secret') {
  process.env.TELEGRAM_WEBHOOK_SECRET = secret
  return {
    request: {
      headers: { 'x-telegram-bot-api-secret-token': secret },
      body: {
        update_id: 1,
        message: {
          from: { id: 999 },
          chat: { id: 999 },
          successful_payment: {
            currency: 'XTR',
            total_amount: 75,
            invoice_payload: JSON.stringify(payload),
            telegram_payment_charge_id: `charge_${Date.now()}`,
          },
        },
      },
    },
    status: 0,
    body: {},
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('S2: urgent/top_placement не применяется к истёкшей вакансии', () => {
  it('НЕ обновляет вакансию если она не published (urgent)', async () => {
    const strapi = makePaymentStrapi('expired')
    const ctx = makeCtx({ type: 'urgent', vacancyDocumentId: 'vac1', userId: 42 })

    const handler = webhookController({ strapi }).handle
    await handler(ctx)

    expect(strapi._docUpdate).not.toHaveBeenCalled()
    // payment записывается с failed/completed_no_effect — проверяем что нотификация не payment_completed
    const notifications = mockSendNotification.mock.calls.map((c: any[]) => c[1]?.type)
    expect(notifications).not.toContain('payment_completed')
  })

  it('НЕ обновляет вакансию если она archived (top_placement)', async () => {
    const strapi = makePaymentStrapi('archived')
    const ctx = makeCtx({ type: 'top_placement', vacancyDocumentId: 'vac1', userId: 42 })

    const handler = webhookController({ strapi }).handle
    await handler(ctx)

    expect(strapi._docUpdate).not.toHaveBeenCalled()
  })

  it('обновляет вакансию если она published (urgent)', async () => {
    const strapi = makePaymentStrapi('published')
    const ctx = makeCtx({ type: 'urgent', vacancyDocumentId: 'vac1', userId: 42 })

    const handler = webhookController({ strapi }).handle
    await handler(ctx)

    expect(strapi._docUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { urgent: true } })
    )
  })
})
