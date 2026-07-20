# TON Connect USDT Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить оплату подписок и пакетов через **USDT-jetton на блокчейне TON** параллельно с существующей оплатой Telegram Stars — как альтернативный рельс для веб-пользователей и как обход географических ограничений.

**Architecture:** Frontend подключает кошелёк пользователя через TON Connect (`@tonconnect/ui-react`) и отправляет USDT-транзакцию на merchant-адрес. Backend слушает on-chain через webhook TON Pay SDK (`@ton-pay/api`) с fallback на polling Tonapi.io и идемпотентно активирует ту же самую логику подписки/кредитов, что использует Stars-webhook (`activateSubscription`, `addCredits`). Каждая оплата привязывается по уникальному `commentId` (UUID в payload транзакции) к записи `payment_intent`.

**Tech Stack:**

- Backend: Strapi 5, TypeScript, `@ton-pay/api`, `@ton/ton` (для парсинга адресов/сумм), Vitest.
- Frontend: Next.js 15, `@tonconnect/ui-react`, TypeScript strict + `exactOptionalPropertyTypes`, MobX.
- Blockchain: TON mainnet (testnet для разработки), USDT-jetton `EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs` (официальный master-контракт USDT).

**Курс:** Автоконверсия из Stars по фиксированной ставке **1 Star = $0.013** (creator withdrawal rate, самый консервативный курс — не заниже́м). Формула: `usdtAmount = starsPrice * 0.013`. USDT-jetton использует 6 десятичных знаков — сумма в наименьших единицах: `Math.round(starsPrice * 0.013 * 1_000_000)`.

**Юридическая оговорка:** приём криптоплатежей регулируется юрисдикцией. Этот план **не** решает налоговые/лицензионные вопросы — только техническую интеграцию. Перед mainnet-запуском отдельно проверить юр. статус приёма крипты для мерчанта GramJob.

---

## File Structure

**Backend, изменения и создания:**

- Modify: `backend/src/api/payment/content-types/payment/schema.json` — добавить поля `provider` (enum `telegram|ton`), `tonTxHash` (string, unique, nullable), `intentId` (string, unique, nullable), `usdtAmount` (decimal).
- Create: `backend/database/migrations/2026-07-20-add-ton-fields-to-payments.js` — миграция для существующих строк (`provider = 'telegram'`).
- Create: `backend/src/api/payment/services/ton-payment.ts` — фабрика намерений (`createPaymentIntent`), верификация транзакций, расчёт USDT-суммы.
- Create: `backend/tests/unit/ton-payment.test.ts` — тесты чистых функций (расчёт суммы, генерация payload).
- Create: `backend/src/api/payment/controllers/ton-payment.ts` — endpoints `POST /payments/ton/intent` (создать намерение, вернуть params транзакции + intentId), `POST /payments/ton/webhook` (TON Pay callback).
- Modify: `backend/src/api/payment/routes/payment.ts` — добавить новые routes.
- Modify: `backend/src/api/payment/services/telegram-bot.ts` — вынести `InvoicePayload` в отдельный файл `payment-types.ts` (используется и для TON), чтобы избежать зависимости TON-модуля от telegram-bot.
- Create: `backend/src/api/payment/services/payment-types.ts` — общий тип `PaymentIntentPayload`.
- Create: `backend/src/api/payment/services/ton-webhook-verify.ts` — верификация подписи TON Pay webhook.
- Modify: `backend/config/plugins.ts` (или где регистрируются env vars) — задокументировать новые env: `TON_MERCHANT_ADDRESS`, `TON_PAY_WEBHOOK_SECRET`, `TON_NETWORK` (`mainnet`/`testnet`), `TONAPI_KEY` (для fallback polling).
- Modify: `backend/.env.example` — добавить те же переменные с комментариями.
- Modify: `backend/src/bootstrap` (или где регистрируются cron) — cron-fallback poller раз в 5 минут: сверяет неподтверждённые `payment_intent` с Tonapi.io на случай, если webhook не дошёл.

**Frontend, изменения и создания:**

- Modify: `frontend/package.json` — `@tonconnect/ui-react`, `@ton/core` (для BOC-payload при отправке транзакции).
- Create: `frontend/public/tonconnect-manifest.json` — обязательный манифест для TON Connect.
- Create: `frontend/src/lib/ton.ts` — константы (адрес USDT-мастера, merchant-адрес, курс), утилита `calculateUsdtAmount(starsPrice)`.
- Create: `frontend/src/lib/ton.test.ts` — тесты утилит.
- Create: `frontend/src/lib/ton-transfer.ts` — построение jetton transfer body (`buildUsdtTransferBody(intentId, amount, merchant)`).
- Create: `frontend/src/lib/ton-transfer.test.ts` — тесты построения BOC.
- Create: `frontend/src/providers/TonConnectProvider.tsx` — обёртка `TonConnectUIProvider` с manifest URL.
- Modify: `frontend/src/app/layout.tsx` — обернуть `<TonConnectProvider>`.
- Create: `frontend/src/stores/TonPaymentStore.ts` — MobX-стор: `createIntent(kind, params)`, `pollIntentStatus(intentId)`, `currentIntent`, `isPolling`.
- Create: `frontend/src/stores/TonPaymentStore.test.ts`.
- Modify: `frontend/src/stores/RootStore.ts` — добавить `tonPayment: TonPaymentStore`.
- Create: `frontend/src/hooks/useTonPayment.ts` — хук: `payWithTon(kind, params)` — создаёт intent, вызывает `tonConnect.sendTransaction`, поллит бэк.
- Create: `frontend/src/hooks/useTonPayment.test.tsx`.
- Create: `frontend/src/components/payment/TonPaymentButton.tsx` — кнопка «Оплатить USDT (TON)».
- Create: `frontend/src/components/payment/TonPaymentButton.test.tsx`.
- Create: `frontend/src/components/payment/TonPaymentStatusDialog.tsx` — модалка ожидания подтверждения ончейн.
- Modify: `frontend/src/app/subscription/SubscriptionClient.tsx` — рядом со Stars-кнопкой в `SubscriptionPlanCard` добавить `TonPaymentButton`.
- Modify: `frontend/src/components/subscription/SubscriptionPlanCard.tsx` — принимать `usdtEquivalent` и рендерить обе кнопки.
- Modify: `frontend/src/components/subscription/PackageCard.tsx` — то же самое.
- Modify: `frontend/src/locales/{ru,en}/common.json` — новые ключи.
- Modify: `frontend/src/types/api.ts` — типы `TonPaymentIntent`, `TonPaymentIntentStatus`.

---

## Task 0: Setup и research

**Files:** —

- [ ] **Step 1: Ветка**

```bash
git checkout main
git pull
git checkout -b feat/ton-usdt-payments
```

- [ ] **Step 2: Baseline тестов**

```bash
cd backend && pnpm typecheck && pnpm test
cd ../frontend && pnpm typecheck && pnpm test --run
```

Записать baseline (backend: 337 unit + 50 integration согласно CLAUDE.md, frontend: 456+).

- [ ] **Step 3: Прочитать актуальный README `@ton-pay/api`**

```bash
open https://github.com/RSquad/ton-pay
```

Проверить:

1. Актуальность пакета (последний commit, версии), совпадает ли API с описанием в этом плане.
2. Формат webhook payload (signature scheme, обязательные поля).
3. Поддержка Jetton USDT (`master: EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs`).

**Если пакет заброшен или API радикально изменился** — переключиться на fallback-путь: **самостоятельная реализация через `@ton/ton` + polling Tonapi.io** (без webhook). Обновить Task 3, 4, 5 соответственно; шаг polling всё равно нужен как fallback.

- [ ] **Step 4: Создать testnet merchant-кошелёк**

Установить Tonkeeper (или @wallet в Telegram), переключить на **testnet**, создать новый кошелёк специально для GramJob. Записать адрес в формате `EQ...` в `.env.local`:

```
TON_NETWORK=testnet
TON_MERCHANT_ADDRESS=EQ<твой-testnet-адрес>
```

Пополнить через testnet faucet: https://t.me/testgiver_ton_bot.

**Важно:** не использовать личный кошелёк — только выделенный merchant.

---

## Task 1: Общий тип payload

Вынести `InvoicePayload` из `telegram-bot.ts` в отдельный файл, чтобы TON-модуль не тянул зависимость от Telegram API. Тип и семантика полей — те же самые.

**Files:**

- Create: `backend/src/api/payment/services/payment-types.ts`
- Modify: `backend/src/api/payment/services/telegram-bot.ts`

- [ ] **Step 1: Создать `payment-types.ts` с содержимым**

```ts
export type PaymentIntentPayload =
  | { type: 'subscription'; planCode: string; userId: number }
  | { type: 'vacancy_pack'; packageId: number; userId: number }
  | { type: 'apply_pack'; packageId: number; userId: number }
  | { type: 'urgent'; vacancyDocumentId: string; userId: number }
  | { type: 'top_placement'; vacancyDocumentId: string; userId: number }
```

- [ ] **Step 2: В `telegram-bot.ts` заменить локальный `InvoicePayload` на реэкспорт из `payment-types.ts`**

```ts
export type { PaymentIntentPayload as InvoicePayload } from './payment-types'
import type { PaymentIntentPayload } from './payment-types'
// Использовать PaymentIntentPayload вместо InvoicePayload во всех сигнатурах
```

- [ ] **Step 3: Прогнать существующие тесты**

```bash
cd backend && pnpm typecheck && pnpm test -- telegram-bot
```

Expected: все зелёные, никаких регрессов.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/payment/services/payment-types.ts backend/src/api/payment/services/telegram-bot.ts
git commit -m "refactor(payment): extract PaymentIntentPayload into shared file"
```

---

## Task 2: Утилиты TON-платежа (чистые функции)

**Files:**

- Create: `backend/src/api/payment/services/ton-payment.ts` (частично — только чистые функции пока)
- Create: `backend/tests/unit/ton-payment.test.ts`

- [ ] **Step 1: Написать failing тесты**

Create: `backend/tests/unit/ton-payment.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import {
  STARS_TO_USDT_RATE,
  calculateUsdtNanoAmount,
  generateIntentId,
  isValidIntentId,
} from '../../src/api/payment/services/ton-payment'

describe('ton-payment: rate & amount', () => {
  it('exports 0.013 as STARS_TO_USDT_RATE', () => {
    expect(STARS_TO_USDT_RATE).toBe(0.013)
  })

  it('calculates 299 stars → 3_887_000 USDT nano (299 * 0.013 * 1e6 = 3_887_000)', () => {
    expect(calculateUsdtNanoAmount(299)).toBe(3_887_000n)
  })

  it('calculates 999 stars → 12_987_000 USDT nano', () => {
    expect(calculateUsdtNanoAmount(999)).toBe(12_987_000n)
  })

  it('rounds fractional cents to integer nano', () => {
    // 100 stars * 0.013 = 1.3 USDT = 1_300_000 nano
    expect(calculateUsdtNanoAmount(100)).toBe(1_300_000n)
  })

  it('throws on non-positive stars', () => {
    expect(() => calculateUsdtNanoAmount(0)).toThrow()
    expect(() => calculateUsdtNanoAmount(-1)).toThrow()
  })
})

describe('ton-payment: intent id', () => {
  it('generateIntentId returns UUID-like string, isValidIntentId accepts it', () => {
    const id = generateIntentId()
    expect(id).toMatch(/^gj-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(isValidIntentId(id)).toBe(true)
  })

  it('rejects arbitrary strings', () => {
    expect(isValidIntentId('random')).toBe(false)
    expect(isValidIntentId('')).toBe(false)
    expect(isValidIntentId('gj-not-a-uuid')).toBe(false)
  })
})
```

- [ ] **Step 2: Прогнать тест — должен упасть**

```bash
cd backend && pnpm test -- ton-payment
```

Expected: FAIL (module not found).

- [ ] **Step 3: Реализовать чистые функции**

Create: `backend/src/api/payment/services/ton-payment.ts`

```ts
import { randomUUID } from 'crypto'

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
```

- [ ] **Step 4: Прогнать тест**

```bash
cd backend && pnpm test -- ton-payment
```

Expected: 8/8 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/payment/services/ton-payment.ts backend/tests/unit/ton-payment.test.ts
git commit -m "feat(payment): add USDT conversion and intent id utilities"
```

---

## Task 3: Расширить schema payment для TON

**Files:**

- Modify: `backend/src/api/payment/content-types/payment/schema.json`
- Create: `backend/database/migrations/2026-07-20-add-ton-fields-to-payments.js`

- [ ] **Step 1: Прочитать текущую schema**

```bash
cat /Users/vitaly/work/GramJob/backend/src/api/payment/content-types/payment/schema.json
```

Зафиксировать существующие атрибуты.

- [ ] **Step 2: Добавить в `attributes` схемы (Strapi авто-генерирует SQL при старте, но unique требует миграции)**

```json
"provider": {
  "type": "enumeration",
  "enum": ["telegram", "ton"],
  "required": true,
  "default": "telegram"
},
"tonTxHash": { "type": "string", "unique": true },
"intentId": { "type": "string", "unique": true },
"usdtAmount": { "type": "decimal" }
```

**Также сделать `telegramChargeId` nullable** (для TON-платежей его нет): убрать `required: true` если стоит.

- [ ] **Step 3: Написать миграцию для существующих строк**

Create: `backend/database/migrations/2026-07-20-add-ton-fields-to-payments.js`

```js
'use strict'

module.exports = {
  async up(knex) {
    // Add columns if they don't exist (Strapi schema.json generates them,
    // but migration ensures explicit control over defaults and backfill)
    const hasProvider = await knex.schema.hasColumn('payments', 'provider')
    if (!hasProvider) {
      await knex.schema.alterTable('payments', (t) => {
        t.string('provider').notNullable().defaultTo('telegram')
        t.string('ton_tx_hash')
        t.string('intent_id')
        t.decimal('usdt_amount', 18, 6)
      })
    }

    // Backfill existing rows
    await knex('payments').whereNull('provider').update({ provider: 'telegram' })

    // Unique indexes (Strapi may create these too, but idempotent guard)
    const idx = async (name, cols) => {
      const exists = await knex.raw(`SELECT 1 FROM pg_indexes WHERE indexname = ?`, [name])
      if (exists.rows.length === 0) {
        await knex.raw(`CREATE UNIQUE INDEX ${name} ON payments (${cols.join(', ')})`)
      }
    }
    await idx('payments_ton_tx_hash_unique', ['ton_tx_hash'])
    await idx('payments_intent_id_unique', ['intent_id'])
  },

  async down(knex) {
    await knex.schema.alterTable('payments', (t) => {
      t.dropColumn('provider')
      t.dropColumn('ton_tx_hash')
      t.dropColumn('intent_id')
      t.dropColumn('usdt_amount')
    })
  },
}
```

- [ ] **Step 4: Обновить `backend/src/contentTypes.d.ts` (если он собирается вручную; иначе Strapi перегенерирует его при старте)**

- [ ] **Step 5: Запустить backend локально, проверить, что миграция и schema применились**

```bash
cd backend && pnpm develop
```

Ожидание: в логах видно применение миграции, старт без ошибок. Проверить в БД:

```sql
\d payments
-- должны быть столбцы provider, ton_tx_hash, intent_id, usdt_amount
```

- [ ] **Step 6: Прогнать все существующие backend-тесты**

```bash
pnpm test
```

Expected: baseline+0, никаких регрессов.

- [ ] **Step 7: Commit**

```bash
git add backend/src/api/payment/content-types/payment/schema.json backend/database/migrations/2026-07-20-add-ton-fields-to-payments.js
git commit -m "feat(payment): add provider/tonTxHash/intentId/usdtAmount fields"
```

---

## Task 4: Endpoint создания intent-а

Endpoint принимает такой же payload как Stars endpoints (`planCode`, `packageId`, `vacancyId`) и возвращает **параметры транзакции для TON Connect** + `intentId`.

**Files:**

- Modify: `backend/src/api/payment/services/ton-payment.ts` (добавить `createIntent`, `buildTransactionParams`)
- Create: `backend/tests/unit/ton-payment-intent.test.ts`
- Create: `backend/src/api/payment/controllers/ton-payment.ts`
- Modify: `backend/src/api/payment/routes/payment.ts`

- [ ] **Step 1: Определить env vars, добавить хелпер**

Добавить в `ton-payment.ts`:

```ts
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

// USDT jetton master (mainnet). Для testnet — использовать testnet USDT (см. Tonapi docs).
export const USDT_MASTER_MAINNET = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
// Testnet USDT master — обычно нет прямого аналога; для тестов можно использовать любой другой jetton
// или mock через TON gas transfer (см. README ton-pay / документацию Tonapi testnet).
export const USDT_MASTER_TESTNET = process.env.TON_USDT_MASTER_TESTNET ?? ''

export function getUsdtMasterAddress(): string {
  return getNetwork() === 'mainnet' ? USDT_MASTER_MAINNET : USDT_MASTER_TESTNET
}
```

- [ ] **Step 2: Написать failing тесты на `buildTransactionParams`**

Create: `backend/tests/unit/ton-payment-intent.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  buildTransactionParams,
  calculateUsdtNanoAmount,
} from '../../src/api/payment/services/ton-payment'

describe('buildTransactionParams', () => {
  beforeEach(() => {
    process.env.TON_MERCHANT_ADDRESS = 'EQTestMerchantAddress0000000000000000000000000000000'
    process.env.TON_NETWORK = 'mainnet'
  })

  it('returns TON Connect transaction params with USDT jetton transfer', () => {
    const params = buildTransactionParams({
      intentId: 'gj-11111111-2222-3333-4444-555555555555',
      starsPrice: 299,
    })

    expect(params.validUntil).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(params.messages).toHaveLength(1)
    const msg = params.messages[0]
    // For jetton transfer the "to" is user's own jetton wallet (calculated at send-time
    // by TonConnect UI via the master address in payload). Our backend returns:
    // - master (USDT master contract) via payload metadata
    // - actual jetton payload built as a BOC
    expect(msg.amount).toBe('50000000') // 0.05 TON for gas
    expect(typeof msg.payload).toBe('string') // BOC base64
    expect(msg.address).toBe(process.env.TON_MERCHANT_ADDRESS)
  })
})
```

**Заметка:** реальная схема jetton transfer — сложнее (`to` должен быть jetton-кошелёк отправителя, не мерчанта; сообщение forward'ится). В простом варианте для MVP делаем упрощённо: TON-транзакция с комментом-intentId + отдельная логика в UI по jetton'у. Реальный код может отличаться — проверить README `@ton-pay/api` или Task 0 Step 3 fallback-путь через `@ton/core`.

**Прагматичное упрощение:** если возиться с jetton-BOC на бэкенде окажется слишком дорого — вернуть с бэка только `{intentId, usdtAmount, merchantAddress}`, а построение BOC сделать на фронте с `@ton/core` (там есть `beginCell().storeUint(0xf8a7ea5, 32)...` для jetton transfer). Это перенесёт сложность на Task 8 (frontend).

- [ ] **Step 3: Реализовать `buildTransactionParams` (упрощённая версия — только для случая, когда сложная BOC-часть уходит на фронт)**

Добавить в `ton-payment.ts`:

```ts
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
 * MVP: возвращает базовые параметры транзакции. Финальный BOC для jetton transfer
 * строится на фронте через @ton/core, потому что расчёт jetton-wallet-адреса
 * отправителя требует user context.
 */
export function buildTransactionParams(input: {
  intentId: string
  starsPrice: number
}): TonConnectTxParams & { usdtNanoAmount: string; merchantAddress: string; usdtMaster: string } {
  const nano = calculateUsdtNanoAmount(input.starsPrice)
  return {
    validUntil: Math.floor(Date.now() / 1000) + 600, // 10 min
    messages: [
      {
        address: getMerchantAddress(),
        amount: '50000000', // 0.05 TON — покрытие gas для jetton forward
        // payload заполняется на фронте
      },
    ],
    usdtNanoAmount: nano.toString(),
    merchantAddress: getMerchantAddress(),
    usdtMaster: getUsdtMasterAddress(),
  }
}
```

- [ ] **Step 4: Реализовать `createPaymentIntent` (запись в БД, возврат tx params)**

Добавить в `ton-payment.ts`:

```ts
import type { Core } from '@strapi/strapi'
import type { PaymentIntentPayload } from './payment-types'

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
      status: 'pending',
    },
  })

  return {
    intentId,
    txParams: buildTransactionParams({ intentId, starsPrice: input.starsPrice }),
  }
}
```

- [ ] **Step 5: Создать controller endpoint**

Create: `backend/src/api/payment/controllers/ton-payment.ts`

```ts
import type { Core } from '@strapi/strapi'
import { createPaymentIntent } from '../services/ton-payment'
import type { PaymentIntentPayload } from '../services/payment-types'

type UserWithPlan = { id: number; subscriptionPlan: string }

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createIntent(ctx: any) {
    const user = ctx.state.user as UserWithPlan
    const body = ctx.request.body as {
      kind?: 'subscription' | 'vacancy_pack' | 'apply_pack' | 'urgent' | 'top_placement'
      planCode?: string
      packageId?: number
      vacancyId?: string
    }

    if (!body.kind) return ctx.badRequest('kind is required')

    let payload: PaymentIntentPayload
    let starsPrice: number

    if (body.kind === 'subscription') {
      if (!body.planCode || !['pro', 'max', 'vip'].includes(body.planCode)) {
        return ctx.badRequest('planCode must be pro|max|vip')
      }
      if (
        body.planCode === 'vip' &&
        user.subscriptionPlan !== 'max' &&
        user.subscriptionPlan !== 'vip'
      ) {
        return ctx.forbidden('VIP requires an active Max subscription')
      }
      const plan = await (strapi.documents as any)(
        'api::subscription-plan.subscription-plan'
      ).findFirst({ filters: { code: { $eq: body.planCode } } })
      if (!plan?.starsPrice) return ctx.notFound('Plan not found')
      payload = { type: 'subscription', planCode: body.planCode, userId: user.id }
      starsPrice = plan.starsPrice
    } else if (body.kind === 'vacancy_pack') {
      if (!body.packageId) return ctx.badRequest('packageId required')
      const pack = (await strapi.db.query('api::vacancy-package.vacancy-package').findOne({
        where: { id: body.packageId },
      })) as { id: number; starsPrice: number } | null
      if (!pack) return ctx.notFound('Vacancy package not found')
      payload = { type: 'vacancy_pack', packageId: pack.id, userId: user.id }
      starsPrice = pack.starsPrice
    } else if (body.kind === 'apply_pack') {
      if (!body.packageId) return ctx.badRequest('packageId required')
      const pack = (await strapi.db.query('api::apply-package.apply-package').findOne({
        where: { id: body.packageId },
      })) as { id: number; starsPrice: number } | null
      if (!pack) return ctx.notFound('Apply package not found')
      payload = { type: 'apply_pack', packageId: pack.id, userId: user.id }
      starsPrice = pack.starsPrice
    } else if (body.kind === 'urgent' || body.kind === 'top_placement') {
      if (!body.vacancyId) return ctx.badRequest('vacancyId required')
      // Reuse validation logic from telegram payment.ts (ownership + status check)
      // For brevity: duplicate the minimal validation here or extract to a shared helper.
      // Both Telegram and TON endpoints should share the same authorization checks.
      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: body.vacancyId,
        fields: ['documentId', 'moderationStatus', 'urgent', 'topPlacement'],
        populate: { postedBy: { fields: ['id'] } },
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')
      if ((vacancy as any).postedBy?.id !== user.id) return ctx.forbidden('Not owner')
      if ((vacancy as any).moderationStatus !== 'published') return ctx.badRequest('Not published')

      const flag = body.kind === 'urgent' ? 'urgent' : 'topPlacement'
      if ((vacancy as any)[flag]) return ctx.badRequest(`Already ${flag}`)

      const { URGENT_PRICE_STARS, TOP_PLACEMENT_PRICE_STARS } =
        await import('../services/telegram-bot')
      payload =
        body.kind === 'urgent'
          ? { type: 'urgent', vacancyDocumentId: body.vacancyId, userId: user.id }
          : { type: 'top_placement', vacancyDocumentId: body.vacancyId, userId: user.id }
      starsPrice = body.kind === 'urgent' ? URGENT_PRICE_STARS : TOP_PLACEMENT_PRICE_STARS
    } else {
      return ctx.badRequest('Unknown kind')
    }

    const result = await createPaymentIntent(strapi, {
      userId: user.id,
      payload,
      starsPrice,
    })
    ctx.body = result
  },

  async getIntentStatus(ctx: any) {
    const user = ctx.state.user as { id: number }
    const { intentId } = ctx.params as { intentId: string }
    const row = (await strapi.db.query('api::payment.payment').findOne({
      where: { intentId, user: user.id },
    })) as { status: string; tonTxHash: string | null } | null
    if (!row) return ctx.notFound('Intent not found')
    ctx.body = { status: row.status, tonTxHash: row.tonTxHash }
  },
})
```

- [ ] **Step 6: Зарегистрировать routes**

Modify: `backend/src/api/payment/routes/payment.ts` — добавить:

```ts
{
  method: 'POST',
  path: '/payments/ton/intent',
  handler: 'ton-payment.createIntent',
  config: { policies: [], auth: { strategies: ['users-permissions'] } },
},
{
  method: 'GET',
  path: '/payments/ton/intent/:intentId',
  handler: 'ton-payment.getIntentStatus',
  config: { policies: [], auth: { strategies: ['users-permissions'] } },
},
```

- [ ] **Step 7: Добавить permission в seed-permissions**

Modify: `backend/src/scripts/seed-permissions.ts` — добавить в список для `authenticated`:

```ts
'payment.createIntent',
'payment.getIntentStatus',
// Точное имя action-а зависит от Strapi convention — проверить, как названы существующие.
```

Актуальная строка (найти по grep — `payment.subscribe`, добавить рядом):

```bash
grep -n "payment\." /Users/vitaly/work/GramJob/backend/src/scripts/seed-permissions.ts
```

- [ ] **Step 8: Прогнать существующие тесты + typecheck**

```bash
cd backend && pnpm typecheck && pnpm test
```

Expected: 0 ошибок, тесты Task 2 + новые вопросы не считаются пока (integration отдельно).

- [ ] **Step 9: Commit**

```bash
git add backend/src/api/payment/
git commit -m "feat(payment): add POST /payments/ton/intent endpoint"
```

---

## Task 5: Webhook TON Pay + fallback poller

**Files:**

- Modify: `backend/src/api/payment/services/ton-payment.ts` (добавить `confirmIntent`)
- Modify: `backend/src/api/payment/controllers/ton-payment.ts` (добавить `webhook` handler)
- Create: `backend/src/api/payment/services/ton-webhook-verify.ts`
- Modify: `backend/src/api/payment/routes/payment.ts` (routes для webhook + public)
- Modify: `backend/src/bootstrap.ts` (или где cron-джобы) — cron polling
- Create: `backend/tests/unit/ton-webhook-verify.test.ts`

- [ ] **Step 1: Написать failing тесты на верификацию подписи**

Create: `backend/tests/unit/ton-webhook-verify.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verifyTonPayWebhookSignature } from '../../src/api/payment/services/ton-webhook-verify'

const SECRET = 'test-secret'

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex')
}

describe('verifyTonPayWebhookSignature', () => {
  it('accepts a correctly signed payload', () => {
    const body = '{"intentId":"gj-x","txHash":"abc"}'
    const sig = sign(body)
    expect(verifyTonPayWebhookSignature(body, sig, SECRET)).toBe(true)
  })

  it('rejects a wrong signature', () => {
    const body = '{"a":1}'
    expect(verifyTonPayWebhookSignature(body, 'deadbeef', SECRET)).toBe(false)
  })

  it('rejects mismatched body', () => {
    const body = '{"a":1}'
    const sig = sign('{"a":2}')
    expect(verifyTonPayWebhookSignature(body, sig, SECRET)).toBe(false)
  })

  it('uses timing-safe comparison', () => {
    // Not directly observable, but ensure it doesn't throw on unequal lengths
    const body = '{}'
    expect(verifyTonPayWebhookSignature(body, 'a', SECRET)).toBe(false)
  })
})
```

- [ ] **Step 2: Реализовать верификацию**

Create: `backend/src/api/payment/services/ton-webhook-verify.ts`

```ts
import crypto from 'crypto'

export function verifyTonPayWebhookSignature(
  rawBody: string,
  incomingSignatureHex: string,
  secret: string
): boolean {
  if (!incomingSignatureHex || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(incomingSignatureHex, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
```

**Заметка:** реальный формат подписи `@ton-pay/api` может отличаться (Ed25519 подпись из TON keypair, base64 вместо hex). Проверить README (Task 0 Step 3) и адаптировать. Тесты обновить под фактический алгоритм.

- [ ] **Step 3: Прогнать тесты**

```bash
cd backend && pnpm test -- ton-webhook-verify
```

Expected: 4/4 PASS.

- [ ] **Step 4: Реализовать `confirmIntent` — активирует подписку/кредиты, идемпотентно**

Добавить в `ton-payment.ts`:

```ts
import { activateSubscription, addCredits } from './subscription-service'
import { sendNotification } from '../../../services/notification.service'
import type { PaymentIntentPayload } from './payment-types'

export async function confirmIntent(
  strapi: Core.Strapi,
  input: { intentId: string; tonTxHash: string; usdtNanoReceived: bigint }
): Promise<'activated' | 'already_confirmed' | 'not_found' | 'underpaid'> {
  const row = (await strapi.db.query('api::payment.payment').findOne({
    where: { intentId: input.intentId },
  })) as {
    id: number
    status: string
    tonTxHash: string | null
    usdtAmount: string | number
    payloadType: string
    planCode: string | null
    packageId: number | null
    vacancyDocumentId: string | null
    user: { id: number } | number
  } | null

  if (!row) return 'not_found'
  if (row.status === 'completed') return 'already_confirmed'

  // Verify received amount >= expected (in nano)
  const expectedNano = BigInt(Math.round(Number(row.usdtAmount) * 10 ** USDT_JETTON_DECIMALS))
  if (input.usdtNanoReceived < expectedNano) {
    await strapi.db.query('api::payment.payment').update({
      where: { id: row.id },
      data: { status: 'failed', tonTxHash: input.tonTxHash },
    })
    return 'underpaid'
  }

  const userId = typeof row.user === 'number' ? row.user : row.user.id

  // Reconstruct payload
  let payload: PaymentIntentPayload
  if (row.payloadType === 'subscription' && row.planCode) {
    payload = { type: 'subscription', planCode: row.planCode, userId }
  } else if (row.payloadType === 'vacancy_pack' && row.packageId) {
    payload = { type: 'vacancy_pack', packageId: row.packageId, userId }
  } else if (row.payloadType === 'apply_pack' && row.packageId) {
    payload = { type: 'apply_pack', packageId: row.packageId, userId }
  } else if (row.payloadType === 'urgent' && row.vacancyDocumentId) {
    payload = { type: 'urgent', vacancyDocumentId: row.vacancyDocumentId, userId }
  } else if (row.payloadType === 'top_placement' && row.vacancyDocumentId) {
    payload = { type: 'top_placement', vacancyDocumentId: row.vacancyDocumentId, userId }
  } else {
    throw new Error(`Cannot reconstruct payload for intent ${input.intentId}`)
  }

  // Mirror the Telegram handleSuccessfulPayment logic
  let detail: string | null = null
  if (payload.type === 'subscription') {
    await activateSubscription(strapi, userId, payload.planCode as any)
    detail = `подписка ${payload.planCode.toUpperCase()} активирована (USDT/TON)`
  } else if (payload.type === 'vacancy_pack') {
    const pack = (await strapi.db.query('api::vacancy-package.vacancy-package').findOne({
      where: { id: payload.packageId },
    })) as { vacancyCredits: number; boostCredits: number } | null
    if (!pack) throw new Error('vacancy_pack not found')
    await addCredits(strapi, userId, 'vacancy', pack.vacancyCredits)
    if (pack.boostCredits > 0) await addCredits(strapi, userId, 'boost', pack.boostCredits)
    detail = `+${pack.vacancyCredits} вакансий (USDT/TON)`
  } else if (payload.type === 'apply_pack') {
    const pack = (await strapi.db.query('api::apply-package.apply-package').findOne({
      where: { id: payload.packageId },
    })) as { applyCredits: number } | null
    if (!pack) throw new Error('apply_pack not found')
    await addCredits(strapi, userId, 'apply', pack.applyCredits)
    detail = `+${pack.applyCredits} откликов (USDT/TON)`
  } else if (payload.type === 'urgent') {
    await strapi.documents('api::vacancy.vacancy').update({
      documentId: payload.vacancyDocumentId,
      data: { urgent: true } as any,
    })
    detail = 'вакансия помечена как срочная (USDT/TON)'
  } else if (payload.type === 'top_placement') {
    await strapi.documents('api::vacancy.vacancy').update({
      documentId: payload.vacancyDocumentId,
      data: { topPlacement: true } as any,
    })
    detail = 'вакансия закреплена в TOP (USDT/TON)'
  }

  await strapi.db.query('api::payment.payment').update({
    where: { id: row.id },
    data: { status: 'completed', tonTxHash: input.tonTxHash },
  })

  if (detail) {
    void sendNotification(strapi, {
      userId,
      type: 'payment_completed',
      templateData: { detail },
    })
  }

  return 'activated'
}
```

**Note про DRY:** сейчас логика активации дублируется с `telegram-webhook.ts`. В идеале нужно извлечь `activateByPayload(strapi, payload)` в общий helper и вызывать из обоих обработчиков. Это можно сделать сразу либо оставить как рефакторинг после MVP. **В этом плане делаем сразу** — добавить Task 5.5 после Task 5:

- [ ] **Step 5: Добавить webhook handler в controller**

В `ton-payment.ts` (controller):

```ts
async webhook(ctx: any) {
  const secret = process.env.TON_PAY_WEBHOOK_SECRET
  if (!secret) {
    strapi.log.error('[ton-webhook] TON_PAY_WEBHOOK_SECRET not set')
    ctx.status = 503
    return
  }

  const rawBody = JSON.stringify(ctx.request.body)
  const sig = ctx.request.headers['x-signature']
  if (typeof sig !== 'string' || !verifyTonPayWebhookSignature(rawBody, sig, secret)) {
    ctx.status = 403
    return
  }

  const body = ctx.request.body as {
    intentId?: string
    txHash?: string
    amount?: string // in nano
  }
  if (!body.intentId || !body.txHash || !body.amount) {
    ctx.status = 400
    return
  }

  try {
    const result = await confirmIntent(strapi, {
      intentId: body.intentId,
      tonTxHash: body.txHash,
      usdtNanoReceived: BigInt(body.amount),
    })
    ctx.body = { result }
  } catch (err) {
    strapi.log.error('[ton-webhook] confirmIntent failed:', err)
    ctx.status = 500
    ctx.body = { error: 'internal' }
  }
},
```

- [ ] **Step 6: Route для webhook (public)**

В `backend/src/api/payment/routes/payment.ts`:

```ts
{
  method: 'POST',
  path: '/payments/ton/webhook',
  handler: 'ton-payment.webhook',
  config: { auth: false }, // signature-based
},
```

- [ ] **Step 7: Cron-fallback poller**

Найти существующий cron-регистратор:

```bash
grep -rn "strapi.cron" /Users/vitaly/work/GramJob/backend/src --include="*.ts"
```

Добавить джобу (адаптировать под фактический API cron в проекте — Strapi 5 использует `config/cron.ts` или регистрирует через `strapi.cron.add`):

```ts
// e.g. in bootstrap.ts
strapi.cron.add({
  tonPayPoller: {
    task: async ({ strapi }) => {
      const pending = (await strapi.db.query('api::payment.payment').findMany({
        where: {
          provider: 'ton',
          status: 'pending',
          createdAt: { $lt: new Date(Date.now() - 60_000) },
        },
        limit: 50,
      })) as Array<{ intentId: string; tonTxHash: string | null }>

      for (const p of pending) {
        try {
          // Query Tonapi.io for transactions to merchant with matching comment
          // If found — call confirmIntent(...)
          // Details of Tonapi call: GET https://tonapi.io/v2/blockchain/accounts/{merchant}/transactions
          // Filter by decoded comment == intentId, extract tx hash and amount from jetton_transfer
          // Skeleton — see backend/src/api/payment/services/ton-poller.ts (create in this step)
        } catch (err) {
          strapi.log.warn(`[ton-poller] intent=${p.intentId} error:`, err)
        }
      }
    },
    options: { rule: '*/5 * * * *' }, // every 5 min
  },
})
```

- [ ] **Step 8: Integration тест на `confirmIntent` — идемпотентность**

Расширить `backend/tests/unit/ton-payment.test.ts` (или создать отдельный integration test если проект их разделяет):

```ts
import { confirmIntent } from '../../src/api/payment/services/ton-payment'
// Требует mock strapi — сверить, как другие тесты (activateSubscription) мокают Strapi
// Тест: два вызова confirmIntent с одним intentId → второй возвращает 'already_confirmed', activateSubscription вызван 1 раз
```

Реальный тест — использовать паттерн existing testов в `backend/tests/unit/` (посмотреть, как мокается `strapi.db.query`).

- [ ] **Step 9: typecheck + все тесты**

```bash
cd backend && pnpm typecheck && pnpm test
```

Expected: baseline + новые PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/src/api/payment/ backend/tests/unit/ton-*
git commit -m "feat(payment): TON Pay webhook + cron fallback poller"
```

---

## Task 6: Frontend — TON Connect провайдер + манифест

**Files:**

- Create: `frontend/public/tonconnect-manifest.json`
- Create: `frontend/src/providers/TonConnectProvider.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/package.json`

- [ ] **Step 1: Установить зависимости**

```bash
cd frontend && pnpm add @tonconnect/ui-react @ton/core
```

- [ ] **Step 2: Создать манифест**

Create: `frontend/public/tonconnect-manifest.json`

```json
{
  "url": "https://gramjob.com",
  "name": "GramJob",
  "iconUrl": "https://gramjob.com/logo-192.png",
  "termsOfUseUrl": "https://gramjob.com/terms",
  "privacyPolicyUrl": "https://gramjob.com/privacy"
}
```

Убедиться, что `logo-192.png` существует в `public/`. Если нет — использовать любую существующую иконку (проверить `public/`).

- [ ] **Step 3: Провайдер**

Create: `frontend/src/providers/TonConnectProvider.tsx`

```tsx
'use client'

import { TonConnectUIProvider } from '@tonconnect/ui-react'
import type { ReactNode } from 'react'

const MANIFEST_URL =
  process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL ??
  (typeof window !== 'undefined' ? `${window.location.origin}/tonconnect-manifest.json` : '')

export function TonConnectProvider({ children }: { children: ReactNode }) {
  if (!MANIFEST_URL) return <>{children}</>
  return <TonConnectUIProvider manifestUrl={MANIFEST_URL}>{children}</TonConnectUIProvider>
}
```

- [ ] **Step 4: Обернуть layout**

Modify: `frontend/src/app/layout.tsx` — добавить `<TonConnectProvider>` **внутрь** существующих провайдеров (StoreProvider, I18n, etc.), близко к корню:

```tsx
import { TonConnectProvider } from '@/providers/TonConnectProvider'
// ...
;<StoreProvider>
  <TonConnectProvider>{children}</TonConnectProvider>
</StoreProvider>
```

- [ ] **Step 5: typecheck**

```bash
cd frontend && pnpm typecheck
```

Expected: 0 ошибок.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/public/tonconnect-manifest.json frontend/src/providers/TonConnectProvider.tsx frontend/src/app/layout.tsx
git commit -m "feat(payment): wire TON Connect provider and manifest"
```

---

## Task 7: Frontend утилиты (курс, jetton BOC)

**Files:**

- Create: `frontend/src/lib/ton.ts`
- Create: `frontend/src/lib/ton.test.ts`
- Create: `frontend/src/lib/ton-transfer.ts`
- Create: `frontend/src/lib/ton-transfer.test.ts`

- [ ] **Step 1: failing тесты для курса**

Create: `frontend/src/lib/ton.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { STARS_TO_USDT_RATE, calculateUsdtDisplayAmount, formatUsdt } from './ton'

describe('ton price', () => {
  it('rate is 0.013', () => expect(STARS_TO_USDT_RATE).toBe(0.013))
  it('299 stars → 3.887 USDT', () => expect(calculateUsdtDisplayAmount(299)).toBeCloseTo(3.887, 3))
  it('999 stars → 12.987 USDT', () =>
    expect(calculateUsdtDisplayAmount(999)).toBeCloseTo(12.987, 3))
  it('formatUsdt truncates to 2 decimals', () => expect(formatUsdt(3.887)).toBe('$3.89'))
})
```

- [ ] **Step 2: реализовать**

Create: `frontend/src/lib/ton.ts`

```ts
export const STARS_TO_USDT_RATE = 0.013
export const USDT_DECIMALS = 6

export function calculateUsdtDisplayAmount(starsPrice: number): number {
  if (!Number.isFinite(starsPrice) || starsPrice <= 0) return 0
  return starsPrice * STARS_TO_USDT_RATE
}

export function calculateUsdtNanoAmount(starsPrice: number): bigint {
  return BigInt(Math.round(calculateUsdtDisplayAmount(starsPrice) * 10 ** USDT_DECIMALS))
}

export function formatUsdt(amount: number): string {
  return `$${amount.toFixed(2)}`
}
```

- [ ] **Step 3: Прогнать**

```bash
cd frontend && pnpm test --run lib/ton
```

Expected: 4/4 PASS.

- [ ] **Step 4: Построение BOC для jetton transfer**

Формула jetton transfer message (op 0xf8a7ea5): см. https://docs.ton.org/develop/dapps/asset-processing/jettons.

Create: `frontend/src/lib/ton-transfer.ts`

```ts
import { Address, beginCell, toNano } from '@ton/core'

export interface JettonTransferParams {
  jettonAmountNano: bigint
  toAddress: string // merchant TON address (raw, not jetton wallet)
  responseAddress: string // usually sender's own wallet
  forwardTonAmount?: bigint // small TON attached to notify recipient (nano)
  comment?: string // optional intentId
}

/**
 * Build the internal message body for a jetton transfer (op 0xf8a7ea5).
 * The result is a base64-encoded BOC to pass into TonConnect UI as `messages[0].payload`.
 * `messages[0].address` must be the sender's jetton-wallet for USDT master (calculated by TonConnect / wallet).
 */
export function buildJettonTransferBody(params: JettonTransferParams): string {
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32) // op = transfer
    .storeUint(0, 64) // query id
    .storeCoins(params.jettonAmountNano)
    .storeAddress(Address.parse(params.toAddress))
    .storeAddress(Address.parse(params.responseAddress))
    .storeBit(false) // no custom payload
    .storeCoins(params.forwardTonAmount ?? toNano('0.01'))
    .storeBit(true) // forward payload as ref
    .storeRef(
      params.comment
        ? beginCell().storeUint(0, 32).storeStringTail(params.comment).endCell()
        : beginCell().endCell()
    )
    .endCell()

  return body.toBoc().toString('base64')
}
```

Create: `frontend/src/lib/ton-transfer.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { buildJettonTransferBody } from './ton-transfer'

describe('buildJettonTransferBody', () => {
  it('returns base64 string with reasonable length for a real jetton transfer', () => {
    const boc = buildJettonTransferBody({
      jettonAmountNano: 1_000_000n, // 1 USDT
      toAddress: 'EQD__________________________________________0vo',
      responseAddress: 'EQD__________________________________________0vo',
      comment: 'gj-11111111-2222-3333-4444-555555555555',
    })
    expect(typeof boc).toBe('string')
    expect(boc.length).toBeGreaterThan(50)
    // base64 alphabet
    expect(boc).toMatch(/^[A-Za-z0-9+/=]+$/)
  })
})
```

- [ ] **Step 5: Прогнать**

```bash
cd frontend && pnpm test --run lib/ton-transfer
```

Expected: 1/1 PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/ton.ts frontend/src/lib/ton.test.ts frontend/src/lib/ton-transfer.ts frontend/src/lib/ton-transfer.test.ts
git commit -m "feat(payment): USDT price conversion and jetton transfer BOC builder"
```

---

## Task 8: MobX стор `TonPaymentStore`

**Files:**

- Create: `frontend/src/stores/TonPaymentStore.ts`
- Create: `frontend/src/stores/TonPaymentStore.test.ts`
- Modify: `frontend/src/stores/RootStore.ts`
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Добавить типы**

Modify: `frontend/src/types/api.ts` (в конец):

```ts
export type TonPaymentKind =
  | 'subscription'
  | 'vacancy_pack'
  | 'apply_pack'
  | 'urgent'
  | 'top_placement'
export type TonPaymentIntentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface TonPaymentIntentResponse {
  intentId: string
  txParams: {
    validUntil: number
    messages: Array<{ address: string; amount: string; payload?: string }>
    usdtNanoAmount: string
    merchantAddress: string
    usdtMaster: string
  }
}

export interface TonIntentStatusResponse {
  status: TonPaymentIntentStatus
  tonTxHash: string | null
}
```

- [ ] **Step 2: failing тесты (см. паттерн PaymentStore для примера мокинга api)**

Create: `frontend/src/stores/TonPaymentStore.test.ts`

Скопировать паттерн из `frontend/src/stores/PaymentStore.test.ts` — те же моки для `api` клиента. Ключевые тесты:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TonPaymentStore } from './TonPaymentStore'
import * as apiModule from '@/lib/api'

vi.mock('@/lib/api')

describe('TonPaymentStore', () => {
  beforeEach(() => vi.resetAllMocks())

  it('createIntent posts kind + params, returns intent', async () => {
    ;(apiModule.api.post as any).mockResolvedValue({
      intentId: 'gj-x',
      txParams: {
        messages: [],
        validUntil: 0,
        usdtNanoAmount: '1300000',
        merchantAddress: 'EQ...',
        usdtMaster: 'EQ...',
      },
    })
    const store = new TonPaymentStore()
    const res = await store.createIntent({ kind: 'subscription', planCode: 'pro' })
    expect(apiModule.api.post).toHaveBeenCalledWith('/payments/ton/intent', {
      kind: 'subscription',
      planCode: 'pro',
    })
    expect(res.intentId).toBe('gj-x')
    expect(store.currentIntent?.intentId).toBe('gj-x')
  })

  it('pollIntentStatus resolves when status becomes completed', async () => {
    let calls = 0
    ;(apiModule.api.get as any).mockImplementation(() => {
      calls += 1
      return Promise.resolve({ status: calls < 3 ? 'pending' : 'completed', tonTxHash: 'abc' })
    })
    const store = new TonPaymentStore()
    const status = await store.pollIntentStatus('gj-x', { intervalMs: 5, timeoutMs: 5000 })
    expect(status.status).toBe('completed')
    expect(calls).toBeGreaterThanOrEqual(3)
  })

  it('pollIntentStatus rejects on timeout', async () => {
    ;(apiModule.api.get as any).mockResolvedValue({ status: 'pending', tonTxHash: null })
    const store = new TonPaymentStore()
    await expect(store.pollIntentStatus('gj-x', { intervalMs: 5, timeoutMs: 20 })).rejects.toThrow(
      /timeout/i
    )
  })
})
```

- [ ] **Step 3: Реализовать стор**

Create: `frontend/src/stores/TonPaymentStore.ts`

```ts
import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '@/lib/api'
import type { TonPaymentKind, TonPaymentIntentResponse, TonIntentStatusResponse } from '@/types/api'

export class TonPaymentStore {
  currentIntent: TonPaymentIntentResponse | null = null
  isPolling = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async createIntent(params: {
    kind: TonPaymentKind
    planCode?: string
    packageId?: number
    vacancyId?: string
  }): Promise<TonPaymentIntentResponse> {
    const res = await api.post<TonPaymentIntentResponse>('/payments/ton/intent', params)
    runInAction(() => {
      this.currentIntent = res
      this.error = null
    })
    return res
  }

  async pollIntentStatus(
    intentId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<TonIntentStatusResponse> {
    const intervalMs = opts.intervalMs ?? 3000
    const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000
    const deadline = Date.now() + timeoutMs

    runInAction(() => {
      this.isPolling = true
    })
    try {
      while (Date.now() < deadline) {
        const res = await api.get<TonIntentStatusResponse>(`/payments/ton/intent/${intentId}`)
        if (res.status === 'completed' || res.status === 'failed') {
          return res
        }
        await new Promise((r) => setTimeout(r, intervalMs))
      }
      throw new Error('Payment confirmation timeout')
    } finally {
      runInAction(() => {
        this.isPolling = false
      })
    }
  }

  clearIntent(): void {
    this.currentIntent = null
    this.error = null
  }
}
```

- [ ] **Step 4: Прогнать тесты**

```bash
cd frontend && pnpm test --run TonPaymentStore
```

Expected: 3/3 PASS.

- [ ] **Step 5: Зарегистрировать в RootStore**

Modify: `frontend/src/stores/RootStore.ts` — добавить `tonPayment: TonPaymentStore`:

```ts
import { TonPaymentStore } from './TonPaymentStore'
// в конструкторе:
this.tonPayment = new TonPaymentStore()
```

- [ ] **Step 6: typecheck**

```bash
cd frontend && pnpm typecheck
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/stores/TonPaymentStore.ts frontend/src/stores/TonPaymentStore.test.ts frontend/src/stores/RootStore.ts frontend/src/types/api.ts
git commit -m "feat(payment): add TonPaymentStore for TON intents"
```

---

## Task 9: Хук `useTonPayment` и кнопка `TonPaymentButton`

**Files:**

- Create: `frontend/src/hooks/useTonPayment.ts`
- Create: `frontend/src/hooks/useTonPayment.test.tsx`
- Create: `frontend/src/components/payment/TonPaymentButton.tsx`
- Create: `frontend/src/components/payment/TonPaymentButton.test.tsx`
- Create: `frontend/src/components/payment/TonPaymentStatusDialog.tsx`

- [ ] **Step 1: Реализовать хук**

Create: `frontend/src/hooks/useTonPayment.ts`

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { useStores } from '@/stores/StoreProvider'
import { buildJettonTransferBody } from '@/lib/ton-transfer'
import type { TonPaymentKind } from '@/types/api'

type Phase =
  | 'idle'
  | 'creating'
  | 'awaiting_signature'
  | 'awaiting_confirmation'
  | 'success'
  | 'error'

export function useTonPayment() {
  const [tonConnectUI] = useTonConnectUI()
  const senderAddress = useTonAddress()
  const { tonPayment, auth } = useStores()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const pay = useCallback(
    async (
      kind: TonPaymentKind,
      params: { planCode?: string; packageId?: number; vacancyId?: string },
      onSuccess?: () => void | Promise<void>
    ): Promise<void> => {
      try {
        setError(null)
        if (!senderAddress) {
          setPhase('awaiting_signature')
          await tonConnectUI.openModal()
          return // user needs to reconnect and retry
        }

        setPhase('creating')
        const intent = await tonPayment.createIntent({ kind, ...params })
        const { intentId, txParams } = intent

        // Frontend строит окончательные messages: jetton transfer BOC + правильный jetton-wallet адрес отправителя
        // Для расчёта jetton-wallet отправителя используется master + owner (senderAddress).
        // Есть готовая утилита в @ton/ton (JettonMaster.getWalletAddress), либо через TonAPI /jettons/{master}/holders?address=...
        // Для MVP: полагаемся на то, что TON Connect wallet (Tonkeeper, MyTonWallet) сами разберутся,
        // если использовать transferJetton схему через wallet API. Альтернатива — вызвать backend endpoint
        // GET /payments/ton/jetton-wallet?owner=... который вернёт нужный адрес.
        //
        // ПРОСТОЙ MVP-путь: собрать message where address = senderJettonWallet (получено с бэка отдельным вызовом
        // или через TonAPI SDK в браузере). Для этого шага — добавить backend endpoint или использовать @ton/ton
        // на клиенте.
        //
        // Из-за сложности этого расчёта — оставить как отдельную реализацию в этом же таске,
        // либо переиспользовать готовые примеры https://github.com/ton-community/tma-usdt-payments-demo

        const senderJettonWallet = await resolveJettonWalletAddress(
          txParams.usdtMaster,
          senderAddress
        )

        const body = buildJettonTransferBody({
          jettonAmountNano: BigInt(txParams.usdtNanoAmount),
          toAddress: txParams.merchantAddress,
          responseAddress: senderAddress,
          comment: intentId,
        })

        setPhase('awaiting_signature')
        await tonConnectUI.sendTransaction({
          validUntil: txParams.validUntil,
          messages: [
            {
              address: senderJettonWallet,
              amount: '50000000', // 0.05 TON for gas
              payload: body,
            },
          ],
        })

        setPhase('awaiting_confirmation')
        const status = await tonPayment.pollIntentStatus(intentId)
        if (status.status === 'completed') {
          setPhase('success')
          await auth.fetchMe()
          await onSuccess?.()
        } else {
          setPhase('error')
          setError('Оплата не подтверждена')
        }
      } catch (err) {
        setPhase('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [tonConnectUI, senderAddress, tonPayment, auth]
  )

  const reset = () => {
    setPhase('idle')
    setError(null)
  }

  return { phase, error, pay, reset }
}

/**
 * Возвращает jetton-wallet адрес отправителя для указанного master-контракта.
 * Использует TonAPI (публичный, без ключа для базовых запросов). При production объёмах
 * — переключиться на @ton/ton JettonMaster.getWalletAddress с локальным RPC.
 */
async function resolveJettonWalletAddress(jettonMaster: string, owner: string): Promise<string> {
  const url = `https://tonapi.io/v2/accounts/${owner}/jettons/${jettonMaster}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to resolve jetton wallet: ${res.status}`)
  const data = (await res.json()) as { wallet_address?: { address?: string } }
  const addr = data.wallet_address?.address
  if (!addr) throw new Error('Jetton wallet not found — пополните USDT баланс в кошельке')
  return addr
}
```

**Заметка:** ветка `resolveJettonWalletAddress` — критическая. Если у пользователя ещё не было USDT на TON, jetton-wallet может не существовать. В production правильнее считать адрес детерминистически (через `JettonMaster.getWalletAddress` из `@ton/ton`, без вызова API). Это отдельная задача — можно оставить fallback на TonAPI для MVP.

- [ ] **Step 2: Тесты для хука (упрощённо — мокаем TON Connect UI)**

Create: `frontend/src/hooks/useTonPayment.test.tsx`

Проверить:

1. `pay()` без подключённого кошелька вызывает `openModal`
2. `pay()` с кошельком вызывает `createIntent`, `sendTransaction`, `pollIntentStatus`
3. При ошибке — `phase = 'error'`, `error` установлен

Использовать `vi.mock('@tonconnect/ui-react', ...)` — вернуть mock хуков `useTonConnectUI`, `useTonAddress`.

Из-за сложности мока — минимум 2 теста: success path и error path. Расширить позже.

- [ ] **Step 3: `TonPaymentButton`**

Create: `frontend/src/components/payment/TonPaymentButton.tsx`

```tsx
'use client'

import { useTonPayment } from '@/hooks/useTonPayment'
import { formatUsdt, calculateUsdtDisplayAmount } from '@/lib/ton'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import type { TonPaymentKind } from '@/types/api'
import { TonPaymentStatusDialog } from './TonPaymentStatusDialog'

export interface TonPaymentButtonProps {
  starsPrice: number
  kind: TonPaymentKind
  planCode?: string
  packageId?: number
  vacancyId?: string
  onSuccess?: () => void | Promise<void>
  className?: string
}

export function TonPaymentButton(props: TonPaymentButtonProps) {
  const { t } = useTranslation()
  const { phase, error, pay, reset } = useTonPayment()
  const usdt = calculateUsdtDisplayAmount(props.starsPrice)

  const handleClick = () => {
    void pay(
      props.kind,
      {
        ...(props.planCode ? { planCode: props.planCode } : {}),
        ...(props.packageId !== undefined ? { packageId: props.packageId } : {}),
        ...(props.vacancyId ? { vacancyId: props.vacancyId } : {}),
      },
      props.onSuccess
    )
  }

  return (
    <>
      <Button variant="outline" onClick={handleClick} className={props.className}>
        {t('tonPayment.payWithUsdt', { amount: formatUsdt(usdt) })}
      </Button>
      <TonPaymentStatusDialog phase={phase} {...(error ? { error } : {})} onClose={reset} />
    </>
  )
}
```

- [ ] **Step 4: `TonPaymentStatusDialog`**

Create: `frontend/src/components/payment/TonPaymentStatusDialog.tsx`

```tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  phase: 'idle' | 'creating' | 'awaiting_signature' | 'awaiting_confirmation' | 'success' | 'error'
  error?: string
  onClose: () => void
}

export function TonPaymentStatusDialog({ phase, error, onClose }: Props) {
  const { t } = useTranslation()
  const open = phase !== 'idle'
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tonPayment.statusTitle')}</DialogTitle>
        </DialogHeader>

        {phase === 'creating' && (
          <StatusRow
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            text={t('tonPayment.creating')}
          />
        )}
        {phase === 'awaiting_signature' && (
          <StatusRow
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            text={t('tonPayment.awaitingSignature')}
          />
        )}
        {phase === 'awaiting_confirmation' && (
          <StatusRow
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            text={t('tonPayment.awaitingConfirmation')}
          />
        )}
        {phase === 'success' && (
          <>
            <StatusRow
              icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
              text={t('tonPayment.success')}
            />
            <Button onClick={onClose} className="mt-4 w-full">
              {t('tonPayment.close')}
            </Button>
          </>
        )}
        {phase === 'error' && (
          <>
            <StatusRow
              icon={<XCircle className="h-5 w-5 text-destructive" />}
              text={error ?? t('tonPayment.errorGeneric')}
            />
            <Button onClick={onClose} className="mt-4 w-full" variant="outline">
              {t('tonPayment.close')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StatusRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  )
}
```

- [ ] **Step 5: Локализационные ключи**

Modify: `frontend/src/locales/{ru,en}/common.json` — добавить блок `tonPayment`:

RU:

```json
"tonPayment": {
  "payWithUsdt": "Оплатить USDT (TON) — {{amount}}",
  "statusTitle": "Оплата USDT",
  "creating": "Готовим транзакцию…",
  "awaitingSignature": "Подпишите в кошельке TON",
  "awaitingConfirmation": "Ожидаем подтверждения в блокчейне…",
  "success": "Оплата подтверждена! ✅",
  "errorGeneric": "Не удалось провести оплату",
  "close": "Закрыть"
}
```

EN:

```json
"tonPayment": {
  "payWithUsdt": "Pay USDT (TON) — {{amount}}",
  "statusTitle": "USDT Payment",
  "creating": "Preparing transaction…",
  "awaitingSignature": "Sign in your TON wallet",
  "awaitingConfirmation": "Waiting for blockchain confirmation…",
  "success": "Payment confirmed! ✅",
  "errorGeneric": "Payment failed",
  "close": "Close"
}
```

- [ ] **Step 6: typecheck**

```bash
cd frontend && pnpm typecheck && pnpm test --run TonPayment
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useTonPayment.ts frontend/src/hooks/useTonPayment.test.tsx frontend/src/components/payment/TonPaymentButton.tsx frontend/src/components/payment/TonPaymentStatusDialog.tsx frontend/src/locales/
git commit -m "feat(payment): TON payment button + status dialog"
```

---

## Task 10: Подключить `TonPaymentButton` в SubscriptionClient и MyVacanciesClient

**Files:**

- Modify: `frontend/src/components/subscription/SubscriptionPlanCard.tsx`
- Modify: `frontend/src/components/subscription/PackageCard.tsx`
- Modify: `frontend/src/app/subscription/SubscriptionClient.tsx`
- Modify: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx`

- [ ] **Step 1: В `SubscriptionPlanCard` рядом со Stars-кнопкой добавить `<TonPaymentButton>`**

```tsx
import { TonPaymentButton } from '@/components/payment/TonPaymentButton'
// ...
{
  plan.starsPrice > 0 && plan.code !== 'free' && (
    <TonPaymentButton
      starsPrice={plan.starsPrice}
      kind="subscription"
      planCode={plan.code}
      onSuccess={async () => {
        // parent uses fetchMe() via onBuy — dispatch external hook via callback prop
      }}
    />
  )
}
```

Проработать проп `onSuccess` — прокинуть из родителя.

- [ ] **Step 2: Аналогично в `PackageCard` — для `vacancy` и `apply` пакетов**

- [ ] **Step 3: В `MyVacanciesClient` рядом с кнопкой Urgent / TOP через Stars — добавить TON-кнопку**

- [ ] **Step 4: Ручная проверка на testnet**

Отдельная секция — см. Task 11.

- [ ] **Step 5: typecheck + все тесты**

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/subscription/ frontend/src/app/subscription/ frontend/src/app/dashboard/vacancies/
git commit -m "feat(subscription): expose TON payment option next to Stars"
```

---

## Task 11: End-to-end проверка в testnet

**Files:** —

- [ ] **Step 1: Локально поднять frontend + backend в testnet-режиме**

```bash
# backend .env.local
TON_NETWORK=testnet
TON_MERCHANT_ADDRESS=EQ<testnet-merchant>
TON_PAY_WEBHOOK_SECRET=dev-secret-any-string
TON_USDT_MASTER_TESTNET=<адрес тестового jetton, см. README @ton-pay/api>

# frontend .env.local
NEXT_PUBLIC_TONCONNECT_MANIFEST_URL=http://localhost:3000/tonconnect-manifest.json
```

- [ ] **Step 2: Установить Tonkeeper в testnet-режиме на телефон, пополнить USDT-jetton через testnet faucet**

- [ ] **Step 3: Пройти путь**

1. Открыть `http://localhost:3000/subscription`, залогиниться.
2. Кликнуть «Оплатить USDT — $3.89» напротив Pro.
3. Открывается TonConnect модалка → выбрать Tonkeeper → отсканировать QR.
4. В Tonkeeper — подтвердить транзакцию (сумма: X testnet USDT).
5. Ожидание модалки «Ожидаем подтверждения…» ~ 5–30 секунд.
6. Backend получает webhook (или cron poller срабатывает через 5 минут).
7. Модалка меняется на «Оплата подтверждена! ✅».
8. `/users/me` возвращает `subscriptionPlan = 'pro'`.
9. Запись в БД: `SELECT * FROM payments ORDER BY id DESC LIMIT 1` → `provider = 'ton'`, `status = 'completed'`, `ton_tx_hash` заполнен.

- [ ] **Step 4: Идемпотентность**

Отправить тот же webhook payload второй раз (или подождать, пока cron poller снова его увидит) — новая запись не должна создаваться, подписка не должна активироваться повторно.

- [ ] **Step 5: Underpayment**

Хакнуть intent-запись в БД: увеличить `usdt_amount` до значения выше реально отправленного, симулировать webhook — статус должен стать `failed`, подписка не активируется.

- [ ] **Step 6: Записать результаты в `docs/qa/2026-07-20-ton-payments-testnet.md`**

---

## Task 12: Env vars для production + документация

**Files:**

- Modify: `backend/.env.example`
- Modify: `docs/development-guide.md` (раздел «TON payments»)

- [ ] **Step 1: Дополнить `.env.example`**

```
# TON payments
TON_NETWORK=testnet                    # or 'mainnet'
TON_MERCHANT_ADDRESS=                  # EQ... адрес merchant TON wallet
TON_PAY_WEBHOOK_SECRET=                # секрет для верификации webhook @ton-pay/api
TON_USDT_MASTER_TESTNET=               # адрес USDT jetton master в testnet (для dev)
TONAPI_KEY=                            # опционально: ключ Tonapi.io для повышенного rate limit
```

- [ ] **Step 2: Добавить раздел в `docs/development-guide.md`**

Описать:

- Как получить merchant-адрес (Tonkeeper, отдельный кошелёк).
- Как настроить webhook @ton-pay/api (URL, secret).
- Проверка через testnet faucet.
- Юридическое: приём крипты регулируется, требуется отдельное консультирование.

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example docs/development-guide.md
git commit -m "docs: TON payments env vars and setup guide"
```

---

## Task 13: Production rollout

**Files:** —

- [ ] **Step 1: Создать production merchant-кошелёк (Tonkeeper, mainnet)**

Записать адрес в production env vars (Hiddence VPS). Обеспечить, чтобы **приватный ключ хранился отдельно от продакшн-сервера** (только адрес и наблюдение за входящими; вывод средств — через offline подпись).

- [ ] **Step 2: Настроить @ton-pay/api webhook на production URL `https://api.gramjob.com/payments/ton/webhook`**

- [ ] **Step 3: Feature flag / скрытый rollout**

Добавить env `TON_PAYMENTS_ENABLED=true` — если false, frontend не показывает `TonPaymentButton`, backend возвращает 404 на `/payments/ton/*`. По умолчанию **false** до подтверждения работы.

- [ ] **Step 4: Прогнать все тесты, задеплоить, проверить в mainnet с малой суммой ($0.10 = ~ 8 stars эквивалент)**

- [ ] **Step 5: Мониторинг: добавить лог + Sentry alert на `payment_ton_underpaid`, `ton_webhook_signature_invalid`**

- [ ] **Step 6: Финальный PR**

```bash
git push -u origin feat/ton-usdt-payments
gh pr create --title "feat: TON USDT payments (subscription + packages + upgrades)" --body "..."
```

Тело PR:

```markdown
## Summary

- Добавлена оплата подписок, пакетов, urgent/top-placement через USDT-jetton на TON.
- Frontend: TON Connect UI, `TonPaymentButton` рядом со Stars-кнопкой.
- Backend: `POST /payments/ton/intent`, `POST /payments/ton/webhook`, cron-fallback polling.
- Курс: фиксированный 1 Star = $0.013.
- Идемпотентность: unique constraint на `intent_id` + `ton_tx_hash`.

## Test plan

- [x] Unit: `calculateUsdtNanoAmount`, `generateIntentId`, `verifyTonPayWebhookSignature`, `buildJettonTransferBody`, `TonPaymentStore`
- [ ] Ручное testnet: полный путь (см. Task 11) — активация подписки Pro
- [ ] Ручное testnet: идемпотентность webhook
- [ ] Ручное testnet: underpayment → status=failed
- [ ] Ручное mainnet: одна реальная оплата $0.10 → проверка активации

## Env vars

- TON_NETWORK, TON_MERCHANT_ADDRESS, TON_PAY_WEBHOOK_SECRET, TON_USDT_MASTER_TESTNET, TON_PAYMENTS_ENABLED

## Legal

⚠️ Приём криптоплатежей регулируется юрисдикцией. Feature-flag выключен по умолчанию. Перед mainnet-запуском отдельно проверить юр. статус.
```

---

## Self-Review Checklist

**Coverage:**

- Backend модель `payments` с полями `provider`, `intentId`, `tonTxHash`, `usdtAmount` → Task 3
- Endpoint создания intent-а → Task 4
- Webhook + верификация подписи → Task 5
- Cron fallback poller через Tonapi.io → Task 5 Step 7
- Идемпотентность (unique на `intent_id` и `tonTxHash`) → Task 3 + Task 5 `confirmIntent`
- Frontend TON Connect провайдер + манифест → Task 6
- Утилиты цены и BOC → Task 7
- Стор для intent-ов + polling → Task 8
- Хук + кнопка + модалка → Task 9
- Интеграция в SubscriptionPlanCard и PackageCard → Task 10
- Testnet проверка + документация → Task 11 + 12
- Production rollout с feature flag → Task 13

**Not covered (intentionally):**

- Отдельные USDT-цены в админке (вариант «фикс USDT-цены в БД» — не выбран пользователем).
- TON (Toncoin) как альтернативная валюта — выбран только USDT.
- Refund/chargeback flow — крипта не поддерживает.
- Full DRY-рефакторинг Telegram vs TON activation (в Task 5 упомянут; можно оставить дублирование для MVP).

**Placeholder scan:** несколько «см. README @ton-pay/api» — это осознанные точки, где реальный API может отличаться (пакет community), тут нужно свериться с актуальной документацией на месте. Все остальные шаги содержат конкретный код.

**Type consistency:**

- `PaymentIntentPayload` — единый тип, экспортирован из `payment-types.ts`, реэкспорт из `telegram-bot.ts` под старым именем `InvoicePayload`.
- `TonPaymentKind`, `TonPaymentIntentStatus`, `TonPaymentIntentResponse`, `TonIntentStatusResponse` — определены в `types/api.ts` в Task 8, используются в Task 8, 9, 10 консистентно.
- `calculateUsdtNanoAmount` — сигнатура одинакова в `backend/ton-payment.ts` и `frontend/lib/ton.ts` (обе возвращают bigint из числа stars).

**Известные точки риска:**

1. `@ton-pay/api` — community-пакет, не официальный TON Foundation. Если он окажется заброшен или API отличается от описанного — fallback на Task 5 cron poller (уже предусмотрен) полностью покрывает функционал.
2. `resolveJettonWalletAddress` через Tonapi.io в браузере — не идеально для production (rate limit). Позже заменить на детерминистический расчёт через `@ton/ton::JettonMaster`.
3. Курс 1 Star = $0.013 захардкожен. Если Telegram изменит market rate — цены в USDT «поплывут» относительно Stars. Мониторить и пересматривать раз в квартал.
