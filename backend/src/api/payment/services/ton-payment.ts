import { randomUUID } from 'crypto'
import type { Core } from '@strapi/strapi'
import type { PaymentIntentPayload } from './payment-types'
import { activateSubscription, addCredits } from './subscription-service'
import { sendNotification } from '../../../services/notification.service'

export const STARS_TO_USDT_RATE = 0.013
export const USDT_JETTON_DECIMALS = 6

export function calculateUsdtNanoAmount(starsPrice: number): bigint {
  if (!Number.isFinite(starsPrice) || starsPrice <= 0) {
    throw new Error(`starsPrice must be > 0 (got ${starsPrice})`)
  }
  const usdt = starsPrice * STARS_TO_USDT_RATE
  const nano = Math.round(usdt * 10 ** USDT_JETTON_DECIMALS)
  return BigInt(nano)
}

const INTENT_PREFIX = 'gj-'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function generateIntentId(): string {
  return `${INTENT_PREFIX}${randomUUID()}`
}

export function isValidIntentId(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith(INTENT_PREFIX)) return false
  return UUID_RE.test(value.slice(INTENT_PREFIX.length))
}

export function getMerchantAddress(): string {
  const addr = process.env.TON_MERCHANT_ADDRESS
  if (!addr) throw new Error('TON_MERCHANT_ADDRESS is not set')
  return addr
}

export function getNetwork(): 'mainnet' | 'testnet' {
  const n = process.env.TON_NETWORK ?? 'testnet'
  if (n !== 'mainnet' && n !== 'testnet') {
    throw new Error(`TON_NETWORK must be 'mainnet' or 'testnet' (got ${n})`)
  }
  return n
}

export const USDT_MASTER_MAINNET = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
export const USDT_MASTER_TESTNET = process.env.TON_USDT_MASTER_TESTNET ?? ''

export function getUsdtMasterAddress(): string {
  if (getNetwork() === 'mainnet') return USDT_MASTER_MAINNET
  if (!USDT_MASTER_TESTNET) {
    console.warn('[TON] TON_USDT_MASTER_TESTNET is not set — testnet jetton transfers will fail')
  }
  return USDT_MASTER_TESTNET
}

export interface TransactionMessage {
  address: string
  amount: string // in TON nano
  payload?: string // base64 BOC
}

export interface TonConnectTxParams {
  validUntil: number
  messages: TransactionMessage[]
}

/**
 * MVP: returns basic transaction params. Final BOC for jetton transfer
 * is built on frontend via @ton/core, as sender's jetton wallet calculation
 * requires user context.
 */
export function buildTransactionParams(input: {
  intentId: string
  starsPrice: number
}): TonConnectTxParams & { usdtNanoAmount: string; merchantAddress: string; usdtMaster: string } {
  const nano = calculateUsdtNanoAmount(input.starsPrice)
  const merchantAddress = getMerchantAddress()
  return {
    validUntil: Math.floor(Date.now() / 1000) + 600, // 10 min
    messages: [
      {
        address: merchantAddress,
        amount: '50000000', // 0.05 TON for gas
      },
    ],
    usdtNanoAmount: nano.toString(),
    merchantAddress,
    usdtMaster: getUsdtMasterAddress(),
  }
}

export async function confirmIntent(
  strapi: Core.Strapi,
  input: { intentId: string; tonTxHash: string; usdtNanoReceived: bigint }
): Promise<'activated' | 'already_confirmed' | 'not_found' | 'underpaid'> {
  const row = (await strapi.db.query('api::payment.payment').findOne({
    where: { intentId: input.intentId },
    populate: { user: { select: ['id'] } },
  })) as {
    id: number
    status: string
    tonTxHash: string | null
    usdtAmount: number
    payloadType: string
    planCode: string | null
    packageId: number | null
    vacancyDocumentId: string | null
    user: { id: number } | number | null
  } | null

  if (!row) return 'not_found'
  if (row.status === 'completed') return 'already_confirmed'

  const expectedNano = BigInt(Math.round(Number(row.usdtAmount) * 10 ** USDT_JETTON_DECIMALS))
  if (input.usdtNanoReceived < expectedNano) {
    await strapi.db.query('api::payment.payment').update({
      where: { id: row.id },
      data: { status: 'failed', tonTxHash: input.tonTxHash },
    })
    return 'underpaid'
  }

  const userId = row.user == null ? 0 : typeof row.user === 'number' ? row.user : row.user.id

  let detail: string | null = null
  if (row.payloadType === 'subscription' && row.planCode) {
    await activateSubscription(strapi, userId, row.planCode as any)
    detail = `подписка ${row.planCode.toUpperCase()} активирована (USDT/TON)`
  } else if (row.payloadType === 'vacancy_pack' && row.packageId) {
    const pack = (await strapi.db.query('api::vacancy-package.vacancy-package').findOne({
      where: { id: row.packageId },
    })) as { vacancyCredits: number; boostCredits: number } | null
    if (!pack) throw new Error('vacancy_pack not found')
    await addCredits(strapi, userId, 'vacancy', pack.vacancyCredits)
    if (pack.boostCredits > 0) await addCredits(strapi, userId, 'boost', pack.boostCredits)
    detail = `+${pack.vacancyCredits} вакансий (USDT/TON)`
  } else if (row.payloadType === 'apply_pack' && row.packageId) {
    const pack = (await strapi.db.query('api::apply-package.apply-package').findOne({
      where: { id: row.packageId },
    })) as { applyCredits: number } | null
    if (!pack) throw new Error('apply_pack not found')
    await addCredits(strapi, userId, 'apply', pack.applyCredits)
    detail = `+${pack.applyCredits} откликов (USDT/TON)`
  } else if (row.payloadType === 'urgent' && row.vacancyDocumentId) {
    await strapi.documents('api::vacancy.vacancy').update({
      documentId: row.vacancyDocumentId,
      data: { urgent: true } as any,
    })
    detail = 'вакансия помечена как срочная (USDT/TON)'
  } else if (row.payloadType === 'top_placement' && row.vacancyDocumentId) {
    await strapi.documents('api::vacancy.vacancy').update({
      documentId: row.vacancyDocumentId,
      data: { topPlacement: true } as any,
    })
    detail = 'вакансия закреплена в TOP (USDT/TON)'
  } else {
    throw new Error(`Cannot activate for payloadType=${row.payloadType}`)
  }

  await strapi.db.query('api::payment.payment').update({
    where: { id: row.id },
    data: { status: 'completed', tonTxHash: input.tonTxHash },
  })

  if (detail && userId) {
    void sendNotification(strapi, {
      userId,
      type: 'payment_completed',
      templateData: { detail },
    })
  }

  return 'activated'
}

export async function createPaymentIntent(
  strapi: Core.Strapi,
  input: {
    userId: number
    payload: PaymentIntentPayload
    starsPrice: number
  }
): Promise<{
  intentId: string
  txParams: ReturnType<typeof buildTransactionParams>
}> {
  const intentId = generateIntentId()
  const nano = calculateUsdtNanoAmount(input.starsPrice)

  await strapi.db.query('api::payment.payment').create({
    data: {
      provider: 'ton',
      intentId,
      payloadType: input.payload.type,
      planCode: input.payload.type === 'subscription' ? input.payload.planCode : null,
      packageId:
        input.payload.type === 'vacancy_pack' || input.payload.type === 'apply_pack'
          ? input.payload.packageId
          : null,
      vacancyDocumentId:
        input.payload.type === 'urgent' || input.payload.type === 'top_placement'
          ? input.payload.vacancyDocumentId
          : null,
      user: input.userId,
      starsAmount: input.starsPrice,
      usdtAmount: Number(nano) / 10 ** USDT_JETTON_DECIMALS,
      status: 'processing',
    },
  })

  return {
    intentId,
    txParams: buildTransactionParams({ intentId, starsPrice: input.starsPrice }),
  }
}
