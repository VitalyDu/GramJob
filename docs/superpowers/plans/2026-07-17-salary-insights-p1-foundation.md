# Salary Insights — Plan P1: Foundation MVP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Первый работающий срез Salary Insights — рынок считается из наших данных + World Bank, показывается индикатор «ниже/в/выше рынка» и мини-график на карточке вакансии, инлайн-подсказка в форме создания вакансии.

**Architecture:** Три новых content type в Strapi (`SalaryStat`, `SalaryDataPoint`, `CountryFallbackStat`). Weekly cron агрегирует данные из двух источников — наши вакансии (`gramjob` adapter) и World Bank per-country (`world_bank` adapter). Публичный `GET /salary-stats` читает из готовой таблицы. `GET /vacancies/:id` расширен полем `marketPosition`. Frontend получает MobX `SalaryStore`, компоненты `MarketPositionBadge` + `SalaryDistributionChart` (mini) на карточке вакансии, `MarketPositionInline` в форме создания.

**Tech Stack:** Backend — Strapi 5, PostgreSQL, TypeScript, jest. Frontend — Next.js 15, React 19, MobX, TailwindCSS, recharts, vitest.

**Spec:** `docs/superpowers/specs/2026-07-17-salary-insights-design.md`

**Follow-up planы (не в этом документе):** P2 — внешние источники (Adzuna, SO Survey, BLS, Eurostat, OECD) + публичный раздел `/salaries`. P3 — SEO ISR-страницы + админ-UI + кэширование.

---

## File map

**Backend — новые файлы:**

```
backend/src/
  api/
    salary-stat/
      content-types/salary-stat/schema.json
      controllers/salary-stat.ts        (findByFilter)
      routes/salary-stat.ts             (кастомный, публичный GET /salary-stats)
      services/salary-stat.ts           (fetchStats — объединяет источники)
    salary-data-point/
      content-types/salary-data-point/schema.json
    country-fallback-stat/
      content-types/country-fallback-stat/schema.json
  services/salary/
    types.ts                            (SalarySource, Seniority, RawSalaryPoint, интерфейс адаптера)
    fx.ts                               (конвертация валют + fallback курсы)
    fx.test.ts
    aggregator.ts                       (percentiles + IQR + sanity limits)
    aggregator.test.ts
    market-indicator.ts                 (below/in/above/insufficient)
    market-indicator.test.ts
    adapters/
      gramjob.ts                        (читает из vacancies + resumes)
      gramjob.test.ts
      world-bank.ts                     (HTTP → per-country avg)
      world-bank.test.ts
    etl.ts                              (orchestrator)
    etl.test.ts
    mappings/
      currency-fallback.json
      world-bank-country-codes.json
```

**Backend — модифицируем:**

```
backend/src/index.ts                    (+ setupSalaryIndexes в bootstrap)
backend/config/cron-tasks.ts            (+ salaryEtl + salaryDataCleanup)
backend/src/api/vacancy/controllers/vacancy.ts   (findOne → добавляем marketPosition)
backend/src/scripts/seed-permissions.ts (+ salary-stat.findByFilter в public role)
backend/.env.example                    (+ FX_API_URL, SALARY_ETL_ENABLED, SALARY_ETL_CRON, SALARY_CLEANUP_CRON)
```

**Frontend — новые файлы:**

```
frontend/src/
  types/api.ts                          (модификация — + salary types)
  lib/
    salary-utils.ts
    salary-utils.test.ts
  stores/
    SalaryStore.ts
    SalaryStore.test.ts
    RootStore.ts                        (+ salary)
  components/salary/
    MarketPositionBadge.tsx
    MarketPositionBadge.test.tsx
    SalaryDistributionChart.tsx
    SalaryDistributionChart.test.tsx
    MarketPositionInline.tsx
    MarketPositionInline.test.tsx
    InsufficientDataNotice.tsx
  hooks/
    useMarketPosition.ts
    useMarketPosition.test.ts
```

**Frontend — модифицируем:**

```
frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx   (+ блок с badge + chart)
frontend/src/components/vacancy/VacancyForm.tsx           (+ MarketPositionInline)
frontend/src/locales/ru/common.json                        (+ salary.*)
frontend/src/locales/en/common.json                        (+ salary.*)
```

---

## Task 1: FX service — фундаментальная конвертация валют

**Files:**

- Create: `backend/src/services/salary/mappings/currency-fallback.json`
- Create: `backend/src/services/salary/fx.ts`
- Create: `backend/src/services/salary/fx.test.ts`

- [ ] **Step 1: Создать fallback-курсы**

`backend/src/services/salary/mappings/currency-fallback.json`:

```json
{
  "updatedAt": "2026-07-17",
  "note": "Fallback USD rates if exchangerate.host is unreachable. Update quarterly.",
  "rates": {
    "USD": 1.0,
    "EUR": 1.08,
    "RUB": 0.011,
    "GBP": 1.27
  }
}
```

- [ ] **Step 2: Написать failing тесты для `convertToUsd`**

`backend/src/services/salary/fx.test.ts`:

```typescript
import { convertToUsd, resetFxCacheForTests } from './fx'

describe('convertToUsd', () => {
  beforeEach(() => resetFxCacheForTests())

  it('returns amount unchanged when currency is USD', async () => {
    const result = await convertToUsd(1000, 'USD')
    expect(result).toBe(1000)
  })

  it('converts EUR to USD using fallback rate when API disabled', async () => {
    const result = await convertToUsd(1000, 'EUR', { useApi: false })
    expect(result).toBe(1080)
  })

  it('rounds result to integer', async () => {
    const result = await convertToUsd(100, 'RUB', { useApi: false })
    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBe(1) // 100 * 0.011 = 1.1 → 1
  })

  it('throws for unknown currency', async () => {
    await expect(convertToUsd(100, 'ZZZ' as never, { useApi: false })).rejects.toThrow(
      /unknown currency/i
    )
  })
})
```

- [ ] **Step 3: Запустить и убедиться, что тест падает**

```
pnpm --filter backend jest src/services/salary/fx.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Реализовать `fx.ts`**

`backend/src/services/salary/fx.ts`:

```typescript
import fallbackData from './mappings/currency-fallback.json'

export type SupportedCurrency = 'USD' | 'EUR' | 'RUB' | 'GBP'

interface CachedRate {
  rate: number
  fetchedAt: number
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<SupportedCurrency, CachedRate>()

export function resetFxCacheForTests(): void {
  cache.clear()
}

async function fetchLiveRate(currency: SupportedCurrency): Promise<number | null> {
  try {
    const url = `${process.env.FX_API_URL ?? 'https://api.exchangerate.host'}/latest?base=${currency}&symbols=USD`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const json = (await res.json()) as { rates?: { USD?: number } }
    return json.rates?.USD ?? null
  } catch {
    return null
  }
}

export async function convertToUsd(
  amount: number,
  currency: SupportedCurrency,
  opts: { useApi?: boolean } = {}
): Promise<number> {
  if (currency === 'USD') return Math.round(amount)

  const fallbackRate = (fallbackData.rates as Record<string, number>)[currency]
  if (fallbackRate === undefined) {
    throw new Error(`convertToUsd: unknown currency ${currency}`)
  }

  const useApi = opts.useApi ?? true
  if (useApi) {
    const cached = cache.get(currency)
    const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS
    let rate = fresh ? cached!.rate : await fetchLiveRate(currency)
    if (rate === null) rate = fallbackRate
    else if (!fresh) cache.set(currency, { rate, fetchedAt: Date.now() })
    return Math.round(amount * rate)
  }

  return Math.round(amount * fallbackRate)
}
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```
pnpm --filter backend jest src/services/salary/fx.test.ts
```

Expected: 4/4 PASS.

- [ ] **Step 6: Коммит**

```
git add backend/src/services/salary/fx.ts \
        backend/src/services/salary/fx.test.ts \
        backend/src/services/salary/mappings/currency-fallback.json
git commit -m "feat(salary): FX-сервис — конвертация валют в USD с кэшем и fallback"
```

---

## Task 2: Aggregator — перцентили + IQR + sanity limits

**Files:**

- Create: `backend/src/services/salary/aggregator.ts`
- Create: `backend/src/services/salary/aggregator.test.ts`

- [ ] **Step 1: Написать failing тесты**

`backend/src/services/salary/aggregator.test.ts`:

```typescript
import {
  computePercentiles,
  removeOutliersIQR,
  filterSanityLimits,
  aggregatePoints,
} from './aggregator'

describe('computePercentiles', () => {
  it('returns null for empty array', () => {
    expect(computePercentiles([])).toBeNull()
  })

  it('returns same value for singleton', () => {
    expect(computePercentiles([1000])).toEqual({ p25: 1000, p50: 1000, p75: 1000 })
  })

  it('computes percentiles on known sequence', () => {
    // 10 values 1000..10000, step 1000
    const arr = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)
    const r = computePercentiles(arr)!
    expect(r.p25).toBeGreaterThanOrEqual(2000)
    expect(r.p25).toBeLessThanOrEqual(3500)
    expect(r.p50).toBeGreaterThanOrEqual(5000)
    expect(r.p50).toBeLessThanOrEqual(6500)
    expect(r.p75).toBeGreaterThanOrEqual(7000)
    expect(r.p75).toBeLessThanOrEqual(8500)
  })
})

describe('filterSanityLimits', () => {
  it('drops values outside [500, 500000]', () => {
    const kept = filterSanityLimits([100, 500, 1000, 500000, 500001])
    expect(kept).toEqual([500, 1000, 500000])
  })
})

describe('removeOutliersIQR', () => {
  it('keeps everything when n < 4', () => {
    expect(removeOutliersIQR([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('drops extreme outlier', () => {
    const arr = [3000, 3500, 4000, 4200, 4500, 5000, 100000]
    const kept = removeOutliersIQR(arr)
    expect(kept).not.toContain(100000)
    expect(kept.length).toBe(6)
  })
})

describe('aggregatePoints', () => {
  it('returns null stats when nothing survives filters', () => {
    const r = aggregatePoints([50, 100]) // all below sanity limit
    expect(r).toEqual({ percentiles: null, sampleSize: 0 })
  })

  it('applies sanity → IQR → percentiles', () => {
    const arr = [3000, 3500, 4000, 4200, 4500, 5000, 100000, 100 /* dropped by sanity */]
    const r = aggregatePoints(arr)
    expect(r.sampleSize).toBe(6) // sanity drops 100, IQR drops 100000
    expect(r.percentiles).not.toBeNull()
  })
})
```

- [ ] **Step 2: Запустить и убедиться, что падает**

```
pnpm --filter backend jest src/services/salary/aggregator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать `aggregator.ts`**

`backend/src/services/salary/aggregator.ts`:

```typescript
export interface Percentiles {
  p25: number
  p50: number
  p75: number
}

export interface AggregateResult {
  percentiles: Percentiles | null
  sampleSize: number
}

const SANITY_MIN_USD_MONTH = 500
const SANITY_MAX_USD_MONTH = 500_000

export function filterSanityLimits(values: number[]): number[] {
  return values.filter((v) => v >= SANITY_MIN_USD_MONTH && v <= SANITY_MAX_USD_MONTH)
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return Math.round(sorted[lo]!)
  const frac = pos - lo
  return Math.round(sorted[lo]! * (1 - frac) + sorted[hi]! * frac)
}

export function computePercentiles(values: number[]): Percentiles | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return {
    p25: quantile(sorted, 0.25),
    p50: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
  }
}

export function removeOutliersIQR(values: number[]): number[] {
  if (values.length < 4) return values
  const p = computePercentiles(values)
  if (!p) return values
  const iqr = p.p75 - p.p25
  const lo = p.p25 - 1.5 * iqr
  const hi = p.p75 + 1.5 * iqr
  return values.filter((v) => v >= lo && v <= hi)
}

export function aggregatePoints(rawUsd: number[]): AggregateResult {
  const sane = filterSanityLimits(rawUsd)
  const cleaned = removeOutliersIQR(sane)
  return {
    percentiles: computePercentiles(cleaned),
    sampleSize: cleaned.length,
  }
}
```

- [ ] **Step 4: Тесты проходят**

```
pnpm --filter backend jest src/services/salary/aggregator.test.ts
```

Expected: PASS all.

- [ ] **Step 5: Коммит**

```
git add backend/src/services/salary/aggregator.ts backend/src/services/salary/aggregator.test.ts
git commit -m "feat(salary): aggregator — P25/P50/P75 с IQR-фильтром и sanity-лимитами"
```

---

## Task 3: Market indicator service

**Files:**

- Create: `backend/src/services/salary/types.ts`
- Create: `backend/src/services/salary/market-indicator.ts`
- Create: `backend/src/services/salary/market-indicator.test.ts`

- [ ] **Step 1: Тип-файл (общие типы для всего салари-модуля)**

`backend/src/services/salary/types.ts`:

```typescript
export type SalarySource = 'adzuna' | 'so_survey' | 'bls' | 'eurostat' | 'gramjob'
export type CountryFallbackSource = 'world_bank' | 'oecd'
export type Seniority = 'junior' | 'middle' | 'senior' | 'lead' | 'any'
export type MarketPositionStatus = 'below' | 'in_range' | 'above' | 'insufficient_data'

export interface RawSalaryPoint {
  salaryUsd: number
  salaryOriginal?: number
  currencyOriginal?: string
  seniority?: Seniority
  externalRef?: string
  collectedAt: Date
}

export interface SalarySourceAdapter {
  source: SalarySource
  isAvailableFor(country: string): boolean
  fetch(input: {
    specializationSlug: string
    country: string
    seniority?: Seniority
  }): Promise<RawSalaryPoint[]>
}

export interface CombinedPercentiles {
  p25Usd: number
  p50Usd: number
  p75Usd: number
  sampleSize: number
}

export interface MarketPositionResult {
  status: MarketPositionStatus
  vacancyMidUsd?: number
  referenceP25Usd?: number
  referenceP50Usd?: number
  referenceP75Usd?: number
  referenceSampleSize?: number
}
```

- [ ] **Step 2: Failing тест**

`backend/src/services/salary/market-indicator.test.ts`:

```typescript
import { computeMarketPosition } from './market-indicator'

const stats = { p25Usd: 3000, p50Usd: 4000, p75Usd: 5000, sampleSize: 100 }

describe('computeMarketPosition', () => {
  it('returns insufficient_data when sampleSize < 10', () => {
    const r = computeMarketPosition({ vacancyMidUsd: 4000, stats: { ...stats, sampleSize: 5 } })
    expect(r.status).toBe('insufficient_data')
    expect(r.vacancyMidUsd).toBe(4000)
  })

  it('returns insufficient_data when stats are null', () => {
    const r = computeMarketPosition({ vacancyMidUsd: 4000, stats: null })
    expect(r.status).toBe('insufficient_data')
  })

  it('below when vacancy mid < P25', () => {
    expect(computeMarketPosition({ vacancyMidUsd: 2500, stats }).status).toBe('below')
  })

  it('in_range at P25', () => {
    expect(computeMarketPosition({ vacancyMidUsd: 3000, stats }).status).toBe('in_range')
  })

  it('in_range between P25 and P75', () => {
    expect(computeMarketPosition({ vacancyMidUsd: 4000, stats }).status).toBe('in_range')
  })

  it('in_range at P75', () => {
    expect(computeMarketPosition({ vacancyMidUsd: 5000, stats }).status).toBe('in_range')
  })

  it('above when vacancy mid > P75', () => {
    expect(computeMarketPosition({ vacancyMidUsd: 6000, stats }).status).toBe('above')
  })

  it('returns reference percentiles when known', () => {
    const r = computeMarketPosition({ vacancyMidUsd: 4000, stats })
    expect(r.referenceP25Usd).toBe(3000)
    expect(r.referenceP50Usd).toBe(4000)
    expect(r.referenceP75Usd).toBe(5000)
    expect(r.referenceSampleSize).toBe(100)
  })
})
```

- [ ] **Step 3: Убедиться, что падает**

```
pnpm --filter backend jest src/services/salary/market-indicator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Реализовать**

`backend/src/services/salary/market-indicator.ts`:

```typescript
import type { CombinedPercentiles, MarketPositionResult } from './types'

const MIN_SAMPLE_FOR_CONFIDENT_POSITION = 10

export function computeMarketPosition(input: {
  vacancyMidUsd: number
  stats: CombinedPercentiles | null
}): MarketPositionResult {
  const { vacancyMidUsd, stats } = input

  if (!stats || stats.sampleSize < MIN_SAMPLE_FOR_CONFIDENT_POSITION) {
    return {
      status: 'insufficient_data',
      vacancyMidUsd,
      ...(stats
        ? {
            referenceP25Usd: stats.p25Usd,
            referenceP50Usd: stats.p50Usd,
            referenceP75Usd: stats.p75Usd,
            referenceSampleSize: stats.sampleSize,
          }
        : {}),
    }
  }

  let status: MarketPositionResult['status']
  if (vacancyMidUsd < stats.p25Usd) status = 'below'
  else if (vacancyMidUsd > stats.p75Usd) status = 'above'
  else status = 'in_range'

  return {
    status,
    vacancyMidUsd,
    referenceP25Usd: stats.p25Usd,
    referenceP50Usd: stats.p50Usd,
    referenceP75Usd: stats.p75Usd,
    referenceSampleSize: stats.sampleSize,
  }
}
```

- [ ] **Step 5: Тесты проходят**

```
pnpm --filter backend jest src/services/salary/market-indicator.test.ts
```

Expected: PASS.

- [ ] **Step 6: Коммит**

```
git add backend/src/services/salary/types.ts \
        backend/src/services/salary/market-indicator.ts \
        backend/src/services/salary/market-indicator.test.ts
git commit -m "feat(salary): market-indicator — below/in_range/above/insufficient"
```

---

## Task 4: Content type `SalaryDataPoint`

**Files:**

- Create: `backend/src/api/salary-data-point/content-types/salary-data-point/schema.json`

- [ ] **Step 1: Написать схему**

`backend/src/api/salary-data-point/content-types/salary-data-point/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "salary_data_points",
  "info": {
    "singularName": "salary-data-point",
    "pluralName": "salary-data-points",
    "displayName": "Salary Data Point",
    "description": "Raw salary observation from one source"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "source": {
      "type": "enumeration",
      "enum": ["adzuna", "so_survey", "bls", "eurostat", "gramjob"],
      "required": true
    },
    "specialization": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::specialization.specialization"
    },
    "country": { "type": "string", "required": true, "maxLength": 8 },
    "seniority": {
      "type": "enumeration",
      "enum": ["junior", "middle", "senior", "lead", "any"]
    },
    "salaryUsd": { "type": "integer", "required": true },
    "salaryOriginal": { "type": "integer" },
    "currencyOriginal": { "type": "string", "maxLength": 8 },
    "exchangeRate": { "type": "decimal" },
    "externalRef": { "type": "string" },
    "collectedAt": { "type": "datetime", "required": true }
  }
}
```

- [ ] **Step 2: Запустить Strapi локально, проверить синхронизацию схемы**

```
docker compose up -d
pnpm --filter backend develop &
# wait ~15s
curl -sf http://localhost:1337/_health && echo OK
kill %1
```

Expected: OK. Strapi создал таблицу `salary_data_points` в PG.

- [ ] **Step 3: Коммит**

```
git add backend/src/api/salary-data-point
git commit -m "feat(salary): content-type SalaryDataPoint (raw observations)"
```

---

## Task 5: Content type `SalaryStat` + уникальный индекс

**Files:**

- Create: `backend/src/api/salary-stat/content-types/salary-stat/schema.json`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Схема**

`backend/src/api/salary-stat/content-types/salary-stat/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "salary_stats",
  "info": {
    "singularName": "salary-stat",
    "pluralName": "salary-stats",
    "displayName": "Salary Stat",
    "description": "Aggregated percentiles for source × spec × country × seniority"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "source": {
      "type": "enumeration",
      "enum": ["adzuna", "so_survey", "bls", "eurostat", "gramjob"],
      "required": true
    },
    "specialization": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::specialization.specialization",
      "required": true
    },
    "country": { "type": "string", "required": true, "maxLength": 8 },
    "seniority": {
      "type": "enumeration",
      "enum": ["junior", "middle", "senior", "lead", "any"],
      "required": true
    },
    "p25Usd": { "type": "integer", "required": true },
    "p50Usd": { "type": "integer", "required": true },
    "p75Usd": { "type": "integer", "required": true },
    "sampleSize": { "type": "integer", "required": true },
    "aggregatedAt": { "type": "datetime", "required": true }
  }
}
```

- [ ] **Step 2: Функция миграции — уникальный индекс**

`backend/src/index.ts` — добавить функцию рядом с `setupVacancySearch`:

```typescript
async function setupSalaryIndexes(strapi: Core.Strapi) {
  try {
    await strapi.db.connection.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS salary_stats_key
        ON salary_stats (source, specialization_id, country, seniority);

      CREATE INDEX IF NOT EXISTS salary_data_points_lookup_idx
        ON salary_data_points (source, specialization_id, country, collected_at);

      CREATE UNIQUE INDEX IF NOT EXISTS country_fallback_stats_key
        ON country_fallback_stats (source, country, year);
    `)
    strapi.log.info('[salary] indexes ensured')
  } catch (err) {
    strapi.log.warn('[salary] index setup skipped', err)
  }
}
```

И в `bootstrap({ strapi })` — добавить вызов **после** остальных `seed*`:

```typescript
await setupSalaryIndexes(strapi)
```

- [ ] **Step 3: Проверить создание таблицы + индекса**

```
docker compose up -d
pnpm --filter backend develop &
# wait ~15s
kill %1
docker compose exec postgres psql -U gramjob -d gramjob -c "\d salary_stats" | grep -E "salary_stats_key"
```

Expected: строка с `UNIQUE, btree (source, specialization_id, country, seniority)`.

- [ ] **Step 4: Коммит**

```
git add backend/src/api/salary-stat backend/src/index.ts
git commit -m "feat(salary): content-type SalaryStat + уникальный индекс"
```

---

## Task 6: Content type `CountryFallbackStat`

**Files:**

- Create: `backend/src/api/country-fallback-stat/content-types/country-fallback-stat/schema.json`

- [ ] **Step 1: Схема**

`backend/src/api/country-fallback-stat/content-types/country-fallback-stat/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "country_fallback_stats",
  "info": {
    "singularName": "country-fallback-stat",
    "pluralName": "country-fallback-stats",
    "displayName": "Country Fallback Stat",
    "description": "Macro-level annual salary per country (World Bank / OECD)"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "source": {
      "type": "enumeration",
      "enum": ["world_bank", "oecd"],
      "required": true
    },
    "country": { "type": "string", "required": true, "maxLength": 8 },
    "avgAnnualUsd": { "type": "integer", "required": true },
    "medianAnnualUsd": { "type": "integer" },
    "year": { "type": "integer", "required": true },
    "aggregatedAt": { "type": "datetime", "required": true }
  }
}
```

- [ ] **Step 2: Пересобрать backend, проверить таблицу**

```
docker compose up -d
pnpm --filter backend develop &
# wait ~15s
kill %1
docker compose exec postgres psql -U gramjob -d gramjob -c "\d country_fallback_stats"
```

Expected: показывает колонки, включая уникальный индекс `country_fallback_stats_key` (создан в Task 5).

- [ ] **Step 3: Коммит**

```
git add backend/src/api/country-fallback-stat
git commit -m "feat(salary): content-type CountryFallbackStat (World Bank / OECD)"
```

---

## Task 7: Adapter — `gramjob` (свои данные)

**Files:**

- Create: `backend/src/services/salary/adapters/gramjob.ts`
- Create: `backend/src/services/salary/adapters/gramjob.test.ts`

- [ ] **Step 1: Failing тест**

`backend/src/services/salary/adapters/gramjob.test.ts`:

```typescript
import { fetchGramjobDataPoints } from './gramjob'
import type { Seniority } from '../types'

const vacancy = (over: Partial<any> = {}) => ({
  moderationStatus: 'published',
  salaryFrom: 3000,
  salaryTo: 5000,
  salaryCurrency: 'USD',
  country: 'DE',
  seniority: ['middle'],
  specialization: { slug: 'frontend-developer' },
  createdAt: new Date().toISOString(),
  documentId: 'v1',
  ...over,
})

function mockStrapi(vacancies: unknown[]) {
  return {
    documents: () => ({
      findMany: async () => vacancies,
    }),
  } as never
}

describe('fetchGramjobDataPoints', () => {
  it('averages salaryFrom+salaryTo → mid', async () => {
    const strapi = mockStrapi([vacancy({ salaryFrom: 3000, salaryTo: 5000 })])
    const points = await fetchGramjobDataPoints(strapi, {
      specializationSlug: 'frontend-developer',
      country: 'DE',
    })
    expect(points).toHaveLength(1)
    expect(points[0]!.salaryUsd).toBe(4000)
    expect(points[0]!.seniority).toBe('middle')
  })

  it('uses one bound if only from OR to is present', async () => {
    const strapi = mockStrapi([vacancy({ salaryFrom: 3000, salaryTo: null })])
    const points = await fetchGramjobDataPoints(strapi, {
      specializationSlug: 'frontend-developer',
      country: 'DE',
    })
    expect(points[0]!.salaryUsd).toBe(3000)
  })

  it('skips vacancies without any salary', async () => {
    const strapi = mockStrapi([vacancy({ salaryFrom: null, salaryTo: null })])
    const points = await fetchGramjobDataPoints(strapi, {
      specializationSlug: 'frontend-developer',
      country: 'DE',
    })
    expect(points).toHaveLength(0)
  })

  it('marks seniority=any when vacancy has multiple seniorities', async () => {
    const strapi = mockStrapi([vacancy({ seniority: ['middle', 'senior'] })])
    const points = await fetchGramjobDataPoints(strapi, {
      specializationSlug: 'frontend-developer',
      country: 'DE',
    })
    expect(points[0]!.seniority).toBe('any')
  })

  it('converts EUR to USD via fx', async () => {
    const strapi = mockStrapi([
      vacancy({ salaryFrom: 1000, salaryTo: 1000, salaryCurrency: 'EUR' }),
    ])
    const points = await fetchGramjobDataPoints(strapi, {
      specializationSlug: 'frontend-developer',
      country: 'DE',
      useLiveFx: false,
    })
    expect(points[0]!.salaryUsd).toBe(1080) // 1000 EUR * 1.08 fallback
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

```
pnpm --filter backend jest src/services/salary/adapters/gramjob.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Реализовать адаптер**

`backend/src/services/salary/adapters/gramjob.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import { convertToUsd, type SupportedCurrency } from '../fx'
import type { RawSalaryPoint, Seniority } from '../types'

const VALID_SENIORITIES: Seniority[] = ['junior', 'middle', 'senior', 'lead']

function pickSeniority(raw: unknown): Seniority {
  if (!Array.isArray(raw) || raw.length !== 1) return 'any'
  const val = raw[0]
  return VALID_SENIORITIES.includes(val as Seniority) ? (val as Seniority) : 'any'
}

function midSalary(from: number | null, to: number | null): number | null {
  if (from && to) return Math.round((from + to) / 2)
  if (from) return from
  if (to) return to
  return null
}

interface VacancyRecord {
  documentId?: string
  salaryFrom: number | null
  salaryTo: number | null
  salaryCurrency: SupportedCurrency
  seniority: unknown
  createdAt: string
}

export async function fetchGramjobDataPoints(
  strapi: Core.Strapi,
  input: {
    specializationSlug: string
    country: string
    useLiveFx?: boolean
  }
): Promise<RawSalaryPoint[]> {
  const vacancies = (await (strapi.documents as any)('api::vacancy.vacancy').findMany({
    filters: {
      moderationStatus: 'published',
      country: input.country,
      specialization: { slug: input.specializationSlug },
    },
    fields: ['documentId', 'salaryFrom', 'salaryTo', 'salaryCurrency', 'seniority', 'createdAt'],
    limit: 5000,
  })) as VacancyRecord[]

  const useApi = input.useLiveFx ?? true

  const points: RawSalaryPoint[] = []
  for (const v of vacancies) {
    const mid = midSalary(v.salaryFrom, v.salaryTo)
    if (mid === null || !v.salaryCurrency) continue
    const usd = await convertToUsd(mid, v.salaryCurrency, { useApi })
    points.push({
      salaryUsd: usd,
      salaryOriginal: mid,
      currencyOriginal: v.salaryCurrency,
      seniority: pickSeniority(v.seniority),
      externalRef: v.documentId,
      collectedAt: new Date(v.createdAt),
    })
  }
  return points
}
```

- [ ] **Step 4: Тесты проходят**

```
pnpm --filter backend jest src/services/salary/adapters/gramjob.test.ts
```

Expected: 5/5 PASS.

- [ ] **Step 5: Коммит**

```
git add backend/src/services/salary/adapters/gramjob.ts \
        backend/src/services/salary/adapters/gramjob.test.ts
git commit -m "feat(salary): gramjob adapter — извлекает точки из своих вакансий"
```

---

## Task 8: Adapter — `world-bank` (per-country fallback)

**Files:**

- Create: `backend/src/services/salary/mappings/world-bank-country-codes.json`
- Create: `backend/src/services/salary/adapters/world-bank.ts`
- Create: `backend/src/services/salary/adapters/world-bank.test.ts`

- [ ] **Step 1: Список кодов стран (ISO-2 → ISO-3, WB использует ISO-3)**

`backend/src/services/salary/mappings/world-bank-country-codes.json`:

```json
{
  "DE": "DEU",
  "US": "USA",
  "GB": "GBR",
  "FR": "FRA",
  "IT": "ITA",
  "ES": "ESP",
  "PL": "POL",
  "NL": "NLD",
  "BE": "BEL",
  "SE": "SWE",
  "FI": "FIN",
  "NO": "NOR",
  "DK": "DNK",
  "CH": "CHE",
  "AT": "AUT",
  "PT": "PRT",
  "CZ": "CZE",
  "IE": "IRL",
  "GR": "GRC",
  "HU": "HUN",
  "RO": "ROU",
  "BG": "BGR",
  "HR": "HRV",
  "SK": "SVK",
  "SI": "SVN",
  "LT": "LTU",
  "LV": "LVA",
  "EE": "EST",
  "CY": "CYP",
  "MT": "MLT",
  "RU": "RUS",
  "UA": "UKR",
  "BY": "BLR",
  "KZ": "KAZ",
  "GE": "GEO",
  "AM": "ARM",
  "AZ": "AZE",
  "TR": "TUR",
  "IN": "IND",
  "CN": "CHN",
  "JP": "JPN",
  "KR": "KOR",
  "SG": "SGP",
  "AU": "AUS",
  "CA": "CAN",
  "BR": "BRA",
  "MX": "MEX",
  "AR": "ARG"
}
```

Индикатор World Bank — `NY.GNP.PCAP.CD` (GNI per capita, current USD). Годовой, свежий на 2–3 года назад.

- [ ] **Step 2: Failing тест**

`backend/src/services/salary/adapters/world-bank.test.ts`:

```typescript
import { parseWorldBankResponse } from './world-bank'

const WB_OK = [
  { page: 1, pages: 1, total: 3 },
  [
    { country: { id: 'DEU' }, value: 54030, date: '2023' },
    { country: { id: 'DEU' }, value: 52000, date: '2022' },
    { country: { id: 'DEU' }, value: null, date: '2024' },
  ],
]

describe('parseWorldBankResponse', () => {
  it('extracts most recent non-null value', () => {
    const r = parseWorldBankResponse(WB_OK)
    expect(r).not.toBeNull()
    expect(r!.avgAnnualUsd).toBe(54030)
    expect(r!.year).toBe(2023)
  })

  it('returns null when all values are null', () => {
    const empty = [{ page: 1 }, [{ country: { id: 'DEU' }, value: null, date: '2023' }]]
    expect(parseWorldBankResponse(empty)).toBeNull()
  })

  it('returns null for malformed payload', () => {
    expect(parseWorldBankResponse({} as never)).toBeNull()
    expect(parseWorldBankResponse([] as never)).toBeNull()
  })
})
```

- [ ] **Step 3: Убедиться, что падает**

```
pnpm --filter backend jest src/services/salary/adapters/world-bank.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Реализовать**

`backend/src/services/salary/adapters/world-bank.ts`:

```typescript
import codeMap from '../mappings/world-bank-country-codes.json'

const WB_INDICATOR = 'NY.GNP.PCAP.CD'

export interface WorldBankRecord {
  country: string
  avgAnnualUsd: number
  year: number
}

interface WBObservation {
  country?: { id: string }
  value: number | null
  date: string
}

export function parseWorldBankResponse(
  json: unknown
): { avgAnnualUsd: number; year: number } | null {
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return null
  const observations = json[1] as WBObservation[]
  const withValue = observations
    .filter((o) => typeof o.value === 'number')
    .sort((a, b) => Number(b.date) - Number(a.date))
  const latest = withValue[0]
  if (!latest || latest.value === null) return null
  return { avgAnnualUsd: Math.round(latest.value), year: Number(latest.date) }
}

export async function fetchWorldBankCountry(country: string): Promise<WorldBankRecord | null> {
  const iso3 = (codeMap as Record<string, string>)[country]
  if (!iso3) return null

  const base = process.env.WORLD_BANK_API_URL ?? 'https://api.worldbank.org/v2'
  const url = `${base}/country/${iso3}/indicator/${WB_INDICATOR}?format=json&per_page=5`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const json = await res.json()
    const parsed = parseWorldBankResponse(json)
    if (!parsed) return null
    return { country, ...parsed }
  } catch {
    return null
  }
}

export function listSupportedCountries(): string[] {
  return Object.keys(codeMap)
}
```

- [ ] **Step 5: Тесты проходят**

```
pnpm --filter backend jest src/services/salary/adapters/world-bank.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 6: Коммит**

```
git add backend/src/services/salary/adapters/world-bank.ts \
        backend/src/services/salary/adapters/world-bank.test.ts \
        backend/src/services/salary/mappings/world-bank-country-codes.json
git commit -m "feat(salary): world-bank adapter — GNI per capita по стране"
```

---

## Task 9: ETL orchestrator (P1)

**Files:**

- Create: `backend/src/services/salary/etl.ts`
- Create: `backend/src/services/salary/etl.test.ts`

- [ ] **Step 1: Failing тест на pure логику upsert**

`backend/src/services/salary/etl.test.ts`:

```typescript
import { groupPointsBySeniority, buildStatRecords } from './etl'
import type { RawSalaryPoint } from './types'

function pt(
  salaryUsd: number,
  seniority?: 'junior' | 'middle' | 'senior' | 'lead' | 'any'
): RawSalaryPoint {
  return {
    salaryUsd,
    ...(seniority ? { seniority } : {}),
    collectedAt: new Date(),
  }
}

describe('groupPointsBySeniority', () => {
  it('groups points and creates any-bucket with all points', () => {
    const groups = groupPointsBySeniority([
      pt(3000, 'middle'),
      pt(4000, 'middle'),
      pt(5000, 'senior'),
      pt(6000),
    ])
    expect(groups.get('middle')!.length).toBe(2)
    expect(groups.get('senior')!.length).toBe(1)
    expect(groups.get('any')!.length).toBe(4)
  })
})

describe('buildStatRecords', () => {
  it('produces one record per non-empty seniority bucket', () => {
    const points = Array.from({ length: 20 }, (_, i) => pt(3000 + i * 100, 'middle'))
    const records = buildStatRecords({
      source: 'gramjob',
      specializationId: 1,
      country: 'DE',
      points,
    })
    // middle + any
    expect(records.length).toBe(2)
    const middle = records.find((r) => r.seniority === 'middle')!
    expect(middle.p50Usd).toBeGreaterThan(0)
    expect(middle.sampleSize).toBe(20)
  })

  it('skips buckets where all points fail sanity/IQR', () => {
    const records = buildStatRecords({
      source: 'gramjob',
      specializationId: 1,
      country: 'DE',
      points: [pt(50, 'middle'), pt(100, 'middle')], // both below sanity limit
    })
    expect(records).toEqual([])
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

```
pnpm --filter backend jest src/services/salary/etl.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Реализовать**

`backend/src/services/salary/etl.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import { aggregatePoints } from './aggregator'
import { fetchGramjobDataPoints } from './adapters/gramjob'
import { fetchWorldBankCountry, listSupportedCountries } from './adapters/world-bank'
import type { RawSalaryPoint, SalarySource, Seniority } from './types'

const SENIORITIES: Seniority[] = ['junior', 'middle', 'senior', 'lead', 'any']

export function groupPointsBySeniority(points: RawSalaryPoint[]): Map<Seniority, RawSalaryPoint[]> {
  const groups = new Map<Seniority, RawSalaryPoint[]>()
  SENIORITIES.forEach((s) => groups.set(s, []))

  for (const p of points) {
    // Every point goes into `any` — it's the universal bucket
    groups.get('any')!.push(p)
    if (p.seniority && p.seniority !== 'any') {
      groups.get(p.seniority)!.push(p)
    }
  }
  return groups
}

export interface StatRecord {
  source: SalarySource
  specialization: number
  country: string
  seniority: Seniority
  p25Usd: number
  p50Usd: number
  p75Usd: number
  sampleSize: number
  aggregatedAt: string
}

export function buildStatRecords(input: {
  source: SalarySource
  specializationId: number
  country: string
  points: RawSalaryPoint[]
}): StatRecord[] {
  const now = new Date().toISOString()
  const grouped = groupPointsBySeniority(input.points)
  const records: StatRecord[] = []
  for (const [seniority, points] of grouped) {
    if (points.length === 0) continue
    const { percentiles, sampleSize } = aggregatePoints(points.map((p) => p.salaryUsd))
    if (!percentiles || sampleSize === 0) continue
    records.push({
      source: input.source,
      specialization: input.specializationId,
      country: input.country,
      seniority,
      p25Usd: percentiles.p25,
      p50Usd: percentiles.p50,
      p75Usd: percentiles.p75,
      sampleSize,
      aggregatedAt: now,
    })
  }
  return records
}

async function upsertSalaryStat(strapi: Core.Strapi, r: StatRecord): Promise<void> {
  const q = strapi.db.query('api::salary-stat.salary-stat')
  const existing = await q.findOne({
    where: {
      source: r.source,
      specialization: r.specialization,
      country: r.country,
      seniority: r.seniority,
    },
  })
  const data = {
    source: r.source,
    specialization: r.specialization,
    country: r.country,
    seniority: r.seniority,
    p25Usd: r.p25Usd,
    p50Usd: r.p50Usd,
    p75Usd: r.p75Usd,
    sampleSize: r.sampleSize,
    aggregatedAt: r.aggregatedAt,
  }
  if (existing) {
    await q.update({ where: { id: existing.id }, data })
  } else {
    await q.create({ data })
  }
}

async function upsertCountryFallback(
  strapi: Core.Strapi,
  r: { source: 'world_bank'; country: string; avgAnnualUsd: number; year: number }
): Promise<void> {
  const q = strapi.db.query('api::country-fallback-stat.country-fallback-stat')
  const existing = await q.findOne({
    where: { source: r.source, country: r.country, year: r.year },
  })
  const data = {
    source: r.source,
    country: r.country,
    avgAnnualUsd: r.avgAnnualUsd,
    year: r.year,
    aggregatedAt: new Date().toISOString(),
  }
  if (existing) {
    await q.update({ where: { id: existing.id }, data })
  } else {
    await q.create({ data })
  }
}

interface EtlSummary {
  sources: Record<string, { records: number; errors: number }>
  durationMs: number
}

export async function runSalaryEtl(strapi: Core.Strapi): Promise<EtlSummary> {
  const started = Date.now()
  const summary: EtlSummary = {
    sources: { gramjob: { records: 0, errors: 0 }, world_bank: { records: 0, errors: 0 } },
    durationMs: 0,
  }

  // 1. gramjob adapter: for each (spec, country) combo present in published vacancies
  const specs = (await (strapi.documents as any)('api::specialization.specialization').findMany({
    fields: ['id', 'slug'],
    limit: 500,
  })) as Array<{ id: number; slug: string }>

  const countriesRaw = await strapi.db.connection.raw(
    `SELECT DISTINCT country FROM vacancies WHERE moderation_status = 'published' AND country IS NOT NULL`
  )
  const countries: string[] = countriesRaw.rows.map((r: { country: string }) => r.country)

  for (const spec of specs) {
    for (const country of countries) {
      try {
        const points = await fetchGramjobDataPoints(strapi, {
          specializationSlug: spec.slug,
          country,
        })
        if (points.length === 0) continue
        const records = buildStatRecords({
          source: 'gramjob',
          specializationId: spec.id,
          country,
          points,
        })
        for (const rec of records) await upsertSalaryStat(strapi, rec)
        summary.sources.gramjob.records += records.length
      } catch (err) {
        summary.sources.gramjob.errors++
        strapi.log.error(`[salary-etl] gramjob failed for ${spec.slug}/${country}`, err)
      }
    }
  }

  // 2. World Bank per-country
  for (const country of listSupportedCountries()) {
    try {
      const rec = await fetchWorldBankCountry(country)
      if (!rec) continue
      await upsertCountryFallback(strapi, { source: 'world_bank', ...rec })
      summary.sources.world_bank.records++
    } catch (err) {
      summary.sources.world_bank.errors++
      strapi.log.error(`[salary-etl] world_bank failed for ${country}`, err)
    }
  }

  summary.durationMs = Date.now() - started
  strapi.log.info(`[salary-etl] done: ${JSON.stringify(summary)}`)
  return summary
}
```

- [ ] **Step 4: Тесты проходят**

```
pnpm --filter backend jest src/services/salary/etl.test.ts
```

Expected: PASS unit тесты (сама orchestrate-функция не тестируется — интеграционный тест сложнее нужного объёма для MVP).

- [ ] **Step 5: Коммит**

```
git add backend/src/services/salary/etl.ts backend/src/services/salary/etl.test.ts
git commit -m "feat(salary): ETL orchestrator (gramjob + world_bank) — pure-логика с тестами"
```

---

## Task 10: Регистрация cron

**Files:**

- Modify: `backend/config/cron-tasks.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Добавить env-переменные**

Дописать в `backend/.env.example`:

```
# Salary Insights
FX_API_URL=https://api.exchangerate.host
WORLD_BANK_API_URL=https://api.worldbank.org/v2
SALARY_ETL_ENABLED=true
SALARY_ETL_CRON=0 2 * * 3
SALARY_CLEANUP_CRON=0 3 1 * *
```

- [ ] **Step 2: Добавить cron-задачи**

В `backend/config/cron-tasks.ts` рядом с существующими:

```typescript
import { runSalaryEtl } from '../src/services/salary/etl'

// ... existing tasks ...

salaryEtl: {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    if (process.env.SALARY_ETL_ENABLED !== 'true') return
    try {
      await runSalaryEtl(strapi)
    } catch (err) {
      strapi.log.error('[cron] salary ETL failed', err)
    }
  },
  options: {
    rule: process.env.SALARY_ETL_CRON || '0 2 * * 3',
    tz: 'UTC',
  },
},

salaryDataCleanup: {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    try {
      const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      const result = await strapi.db.connection.raw(
        `DELETE FROM salary_data_points WHERE source <> 'so_survey' AND collected_at < ?`,
        [cutoff],
      )
      strapi.log.info(`[cron] salary cleanup: removed ${result.rowCount ?? 0} old points`)
    } catch (err) {
      strapi.log.error('[cron] salary cleanup failed', err)
    }
  },
  options: {
    rule: process.env.SALARY_CLEANUP_CRON || '0 3 1 * *',
    tz: 'UTC',
  },
},
```

- [ ] **Step 3: Проверить, что backend стартует и cron регистрируется**

```
docker compose up -d
pnpm --filter backend develop 2>&1 | tee /tmp/backend.log &
sleep 20
grep -i "salaryEtl" /tmp/backend.log || echo "no direct log, but no crash — cron registered"
kill %1
```

Expected: backend стартует без ошибок; в норме Strapi не логирует список cron-задач, но отсутствие ошибок = регистрация прошла.

- [ ] **Step 4: Коммит**

```
git add backend/config/cron-tasks.ts backend/.env.example
git commit -m "feat(salary): регистрация weekly ETL cron + monthly cleanup"
```

---

## Task 11: Salary-stat controller + service + route

**Files:**

- Create: `backend/src/api/salary-stat/services/salary-stat.ts`
- Create: `backend/src/api/salary-stat/controllers/salary-stat.ts`
- Create: `backend/src/api/salary-stat/routes/salary-stat.ts`
- Modify: `backend/src/scripts/seed-permissions.ts`

- [ ] **Step 1: Service — объединение источников + fallback**

`backend/src/api/salary-stat/services/salary-stat.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import type { Seniority } from '../../../services/salary/types'

interface Row {
  source: string
  p25Usd: number
  p50Usd: number
  p75Usd: number
  sampleSize: number
  aggregatedAt: string
}

export interface CombinedStats {
  p25Usd: number
  p50Usd: number
  p75Usd: number
  sampleSize: number
  lowConfidence: boolean
  updatedAt: string
}

export interface SalaryStatsBundle {
  specialization: { slug: string; name: unknown }
  country: string
  seniority: Seniority
  combined: CombinedStats | null
  bySources: Array<{ source: string } & Omit<CombinedStats, 'lowConfidence' | 'updatedAt'>>
  fallback: {
    source: 'world_bank' | 'oecd'
    avgAnnualUsd: number
    note: string
  } | null
}

const LOW_CONFIDENCE_SAMPLE = 10

async function fetchStatsForSeniority(
  strapi: Core.Strapi,
  input: { specializationId: number; country: string; seniority: Seniority }
): Promise<Row[]> {
  const q = await strapi.db.connection.raw(
    `
    SELECT source, p25_usd AS "p25Usd", p50_usd AS "p50Usd", p75_usd AS "p75Usd",
           sample_size AS "sampleSize", aggregated_at AS "aggregatedAt"
    FROM salary_stats
    WHERE specialization_id = ? AND country = ? AND seniority = ?
    `,
    [input.specializationId, input.country, input.seniority]
  )
  return q.rows as Row[]
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? Math.round((s[m - 1]! + s[m]!) / 2) : s[m]!
}

function combineRows(rows: Row[]): CombinedStats | null {
  if (rows.length === 0) return null
  const total = rows.reduce((sum, r) => sum + r.sampleSize, 0)
  if (total === 0) return null

  // Sample-size–weighted percentiles: honest approximation on the pool.
  // p25 across sources: weighted mean of p25Usd by sampleSize.
  const weighted = (getter: (r: Row) => number): number => {
    const num = rows.reduce((s, r) => s + getter(r) * r.sampleSize, 0)
    return Math.round(num / total)
  }

  const latest = rows.reduce(
    (max, r) => (new Date(r.aggregatedAt) > new Date(max) ? r.aggregatedAt : max),
    rows[0]!.aggregatedAt
  )

  return {
    p25Usd: weighted((r) => r.p25Usd),
    p50Usd: weighted((r) => r.p50Usd),
    p75Usd: weighted((r) => r.p75Usd),
    sampleSize: total,
    lowConfidence: total < LOW_CONFIDENCE_SAMPLE,
    updatedAt: latest,
  }
}

async function fetchFallback(
  strapi: Core.Strapi,
  country: string
): Promise<SalaryStatsBundle['fallback']> {
  const q = await strapi.db.connection.raw(
    `SELECT source, avg_annual_usd AS "avgAnnualUsd", year
     FROM country_fallback_stats
     WHERE country = ?
     ORDER BY year DESC LIMIT 1`,
    [country]
  )
  const row = q.rows[0]
  if (!row) return null
  return {
    source: row.source,
    avgAnnualUsd: row.avgAnnualUsd,
    note: 'Точных данных по этой специализации нет. Средняя зарплата по стране.',
  }
}

export async function fetchSalaryStats(
  strapi: Core.Strapi,
  input: { specializationSlug: string; country: string; seniority: Seniority }
): Promise<SalaryStatsBundle | null> {
  const spec = (await (strapi.documents as any)('api::specialization.specialization').findFirst({
    filters: { slug: input.specializationSlug },
    fields: ['id', 'slug', 'name'],
  })) as { id: number; slug: string; name: unknown } | null

  if (!spec) return null

  let rows = await fetchStatsForSeniority(strapi, {
    specializationId: spec.id,
    country: input.country,
    seniority: input.seniority,
  })

  // Fallback: если по конкретной seniority нет — берём any
  if (rows.length === 0 && input.seniority !== 'any') {
    rows = await fetchStatsForSeniority(strapi, {
      specializationId: spec.id,
      country: input.country,
      seniority: 'any',
    })
  }

  const combined = combineRows(rows)
  const fallback = combined ? null : await fetchFallback(strapi, input.country)

  return {
    specialization: { slug: spec.slug, name: spec.name },
    country: input.country,
    seniority: input.seniority,
    combined,
    bySources: rows.map((r) => ({
      source: r.source,
      p25Usd: r.p25Usd,
      p50Usd: r.p50Usd,
      p75Usd: r.p75Usd,
      sampleSize: r.sampleSize,
    })),
    fallback,
  }
}
```

- [ ] **Step 2: Controller + route**

`backend/src/api/salary-stat/controllers/salary-stat.ts`:

```typescript
import type { Context } from 'koa'
import { fetchSalaryStats } from '../services/salary-stat'
import type { Seniority } from '../../../services/salary/types'

const VALID_SENIORITIES: Seniority[] = ['junior', 'middle', 'senior', 'lead', 'any']

function parseSeniority(raw: unknown): Seniority {
  if (typeof raw !== 'string') return 'any'
  return VALID_SENIORITIES.includes(raw as Seniority) ? (raw as Seniority) : 'any'
}

export default {
  async findByFilter(ctx: Context) {
    const specialization = String(ctx.query.specialization ?? '').trim()
    const country = String(ctx.query.country ?? '')
      .trim()
      .toUpperCase()
    const seniority = parseSeniority(ctx.query.seniority)

    if (!specialization) return ctx.badRequest('specialization is required')
    if (!country) return ctx.badRequest('country is required')

    const strapi = (ctx as { strapi: unknown }).strapi ?? (globalThis as any).strapi
    const bundle = await fetchSalaryStats(strapi, {
      specializationSlug: specialization,
      country,
      seniority,
    })

    if (!bundle) return ctx.notFound('specialization not found')
    ctx.body = bundle
  },
}
```

`backend/src/api/salary-stat/routes/salary-stat.ts`:

```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/salary-stats',
      handler: 'salary-stat.findByFilter',
      config: { auth: false },
    },
  ],
}
```

- [ ] **Step 3: Разрешения для public роли**

В `backend/src/scripts/seed-permissions.ts` найти массив `PUBLIC_PERMISSIONS` (или добавить, если его нет — по аналогии с `AUTHENTICATED_PERMISSIONS`):

```typescript
// Найти существующий блок PUBLIC_PERMISSIONS и добавить:
'api::salary-stat.salary-stat.findByFilter',
```

Если в файле нет отдельного `PUBLIC_PERMISSIONS`, посмотреть, как разрешаются другие публичные endpoints (например `api::vacancy.vacancy.findPublished`) и добавить `salary-stat.findByFilter` по тому же паттерну.

- [ ] **Step 4: Ручная проверка endpoint**

```
docker compose up -d
pnpm --filter backend develop &
sleep 20
curl -s "http://localhost:1337/salary-stats?specialization=frontend-developer&country=DE&seniority=middle" | jq
kill %1
```

Expected: JSON с `combined: null, fallback: null, bySources: []` (пока нет данных). Не 401, не 404.

- [ ] **Step 5: Коммит**

```
git add backend/src/api/salary-stat backend/src/scripts/seed-permissions.ts
git commit -m "feat(salary): публичный GET /salary-stats + сервис объединения источников"
```

---

## Task 12: Расширение `GET /vacancies/:id` — `marketPosition`

**Files:**

- Modify: `backend/src/api/vacancy/controllers/vacancy.ts`

- [ ] **Step 1: Прочитать существующий `findOne`**

```
grep -n "findOne" backend/src/api/vacancy/controllers/vacancy.ts | head
```

Найти функцию `findOne`. Она возвращает вакансию с populate.

- [ ] **Step 2: Добавить helper для расчёта marketPosition**

В том же файле, ниже импортов:

```typescript
import { convertToUsd } from '../../../services/salary/fx'
import { computeMarketPosition } from '../../../services/salary/market-indicator'
import { fetchSalaryStats } from '../../salary-stat/services/salary-stat'
import type { Seniority } from '../../../services/salary/types'

async function attachMarketPosition(strapi: any, vacancy: any): Promise<void> {
  const { salaryFrom, salaryTo, salaryCurrency, country, seniority, specialization } = vacancy
  if (!country || !specialization?.slug) return
  if (!salaryFrom && !salaryTo) return

  const mid =
    salaryFrom && salaryTo ? Math.round((salaryFrom + salaryTo) / 2) : (salaryFrom ?? salaryTo)

  const vacancyMidUsd = await convertToUsd(mid, salaryCurrency ?? 'USD')

  const seniorities: string[] = Array.isArray(seniority) ? seniority : []
  const vacancySeniority: Seniority =
    seniorities.length === 1 && ['junior', 'middle', 'senior', 'lead'].includes(seniorities[0])
      ? (seniorities[0] as Seniority)
      : 'any'

  const bundle = await fetchSalaryStats(strapi, {
    specializationSlug: specialization.slug,
    country,
    seniority: vacancySeniority,
  })

  if (!bundle?.combined) {
    vacancy.marketPosition = { status: 'insufficient_data', vacancyMidUsd }
    return
  }

  vacancy.marketPosition = computeMarketPosition({
    vacancyMidUsd,
    stats: {
      p25Usd: bundle.combined.p25Usd,
      p50Usd: bundle.combined.p50Usd,
      p75Usd: bundle.combined.p75Usd,
      sampleSize: bundle.combined.sampleSize,
    },
  })
}
```

- [ ] **Step 3: Вызвать в конце `findOne` перед `ctx.body = ...`**

Найти в `findOne` строку, где готовится ответ (например `ctx.body = { data: vacancy }` или похожее). Прямо перед этой строкой добавить:

```typescript
await attachMarketPosition(strapi, vacancy)
```

(Точное место зависит от структуры функции — читаем текущий код и вставляем после того, как `vacancy` полностью загружена с populate `specialization`).

- [ ] **Step 4: Убедиться, что `specialization` в populate**

Проверить, что `findOne` уже populate `specialization` с полем `slug`. Если нет — добавить в populate: `specialization: { fields: ['slug'] }`.

- [ ] **Step 5: Ручная проверка**

```
docker compose up -d
pnpm --filter backend develop &
sleep 20
# любой published vacancy id
curl -s "http://localhost:1337/vacancies/1" | jq '.marketPosition'
kill %1
```

Expected: `{ "status": "insufficient_data", "vacancyMidUsd": ... }` (данных пока нет — статус ожидаемый).

- [ ] **Step 6: Коммит**

```
git add backend/src/api/vacancy/controllers/vacancy.ts
git commit -m "feat(salary): marketPosition в ответе GET /vacancies/:id"
```

---

## Task 13: Frontend — типы

**Files:**

- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Найти `Vacancy` и добавить types**

Открыть `frontend/src/types/api.ts`, найти определение `Vacancy`. Добавить рядом с ним:

```typescript
export type SalarySource = 'adzuna' | 'so_survey' | 'bls' | 'eurostat' | 'gramjob'
export type SalaryFallbackSource = 'world_bank' | 'oecd'
export type MarketPositionStatus = 'below' | 'in_range' | 'above' | 'insufficient_data'

export interface SalaryPercentiles {
  p25Usd: number
  p50Usd: number
  p75Usd: number
  sampleSize: number
}

export interface SalaryStatsResponse {
  specialization: { slug: string; name: LocalizedString }
  country: string
  seniority: SeniorityEnum | 'any'
  combined: (SalaryPercentiles & { lowConfidence: boolean; updatedAt: string }) | null
  bySources: Array<{ source: SalarySource } & SalaryPercentiles>
  fallback: {
    source: SalaryFallbackSource
    avgAnnualUsd: number
    note: string
  } | null
}

export interface MarketPosition {
  status: MarketPositionStatus
  vacancyMidUsd?: number
  referenceP25Usd?: number
  referenceP50Usd?: number
  referenceP75Usd?: number
  referenceSampleSize?: number
}
```

И в интерфейсе `Vacancy` добавить поле:

```typescript
marketPosition?: MarketPosition
```

- [ ] **Step 2: Убедиться, что тип-чекер зелёный**

```
pnpm --filter frontend tsc --noEmit
```

Expected: 0 ошибок.

- [ ] **Step 3: Коммит**

```
git add frontend/src/types/api.ts
git commit -m "feat(salary): frontend-типы SalaryStatsResponse и MarketPosition"
```

---

## Task 14: Frontend — `salary-utils`

**Files:**

- Create: `frontend/src/lib/salary-utils.ts`
- Create: `frontend/src/lib/salary-utils.test.ts`

- [ ] **Step 1: Failing тест**

`frontend/src/lib/salary-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatUsd, marketPositionLabelKey, computeLocalPosition } from './salary-utils'

describe('formatUsd', () => {
  it('formats thousands with $ and k-suffix under 10k', () => {
    expect(formatUsd(3200)).toBe('$3,200')
  })

  it('formats large numbers with k-suffix', () => {
    expect(formatUsd(15000)).toBe('$15.0k')
  })

  it('handles zero and negatives', () => {
    expect(formatUsd(0)).toBe('$0')
    expect(formatUsd(-100)).toBe('−$100')
  })
})

describe('marketPositionLabelKey', () => {
  it('maps status to i18n key', () => {
    expect(marketPositionLabelKey('below')).toBe('salary.marketPosition.below')
    expect(marketPositionLabelKey('in_range')).toBe('salary.marketPosition.in_range')
    expect(marketPositionLabelKey('above')).toBe('salary.marketPosition.above')
    expect(marketPositionLabelKey('insufficient_data')).toBe('salary.marketPosition.insufficient')
  })
})

describe('computeLocalPosition', () => {
  const stats = { p25Usd: 3000, p50Usd: 4000, p75Usd: 5000, sampleSize: 100 }
  it('returns insufficient_data when stats null', () => {
    expect(computeLocalPosition(4000, null).status).toBe('insufficient_data')
  })
  it('returns insufficient_data when sampleSize < 10', () => {
    expect(computeLocalPosition(4000, { ...stats, sampleSize: 5 }).status).toBe('insufficient_data')
  })
  it('below when below p25', () => {
    expect(computeLocalPosition(2500, stats).status).toBe('below')
  })
  it('in_range within [p25, p75]', () => {
    expect(computeLocalPosition(4000, stats).status).toBe('in_range')
  })
  it('above when above p75', () => {
    expect(computeLocalPosition(6000, stats).status).toBe('above')
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

```
pnpm --filter frontend vitest run src/lib/salary-utils.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать**

`frontend/src/lib/salary-utils.ts`:

```typescript
import type { MarketPosition, MarketPositionStatus, SalaryPercentiles } from '@/types/api'

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0'
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '−' : ''
  if (abs >= 10_000) {
    return `${sign}$${(abs / 1000).toFixed(1)}k`
  }
  return `${sign}$${abs.toLocaleString('en-US')}`
}

const LABEL_MAP: Record<MarketPositionStatus, string> = {
  below: 'salary.marketPosition.below',
  in_range: 'salary.marketPosition.in_range',
  above: 'salary.marketPosition.above',
  insufficient_data: 'salary.marketPosition.insufficient',
}

export function marketPositionLabelKey(status: MarketPositionStatus): string {
  return LABEL_MAP[status]
}

const LOW_CONFIDENCE = 10

export function computeLocalPosition(
  midUsd: number,
  stats: SalaryPercentiles | null
): MarketPosition {
  if (!stats || stats.sampleSize < LOW_CONFIDENCE) {
    return { status: 'insufficient_data', vacancyMidUsd: midUsd }
  }
  let status: MarketPositionStatus
  if (midUsd < stats.p25Usd) status = 'below'
  else if (midUsd > stats.p75Usd) status = 'above'
  else status = 'in_range'
  return {
    status,
    vacancyMidUsd: midUsd,
    referenceP25Usd: stats.p25Usd,
    referenceP50Usd: stats.p50Usd,
    referenceP75Usd: stats.p75Usd,
    referenceSampleSize: stats.sampleSize,
  }
}
```

- [ ] **Step 4: Тесты проходят**

```
pnpm --filter frontend vitest run src/lib/salary-utils.test.ts
```

Expected: 10/10 PASS.

- [ ] **Step 5: Коммит**

```
git add frontend/src/lib/salary-utils.ts frontend/src/lib/salary-utils.test.ts
git commit -m "feat(salary): salary-utils — форматтеры и локальный расчёт позиции"
```

---

## Task 15: Frontend — `SalaryStore`

**Files:**

- Create: `frontend/src/stores/SalaryStore.ts`
- Create: `frontend/src/stores/SalaryStore.test.ts`
- Modify: `frontend/src/stores/RootStore.ts`

- [ ] **Step 1: Failing тест**

`frontend/src/stores/SalaryStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SalaryStore } from './SalaryStore'
import type { SalaryStatsResponse } from '@/types/api'

const bundle = (over: Partial<SalaryStatsResponse> = {}): SalaryStatsResponse => ({
  specialization: { slug: 'x', name: { ru: 'X', en: 'X' } },
  country: 'DE',
  seniority: 'middle',
  combined: {
    p25Usd: 3000,
    p50Usd: 4000,
    p75Usd: 5000,
    sampleSize: 100,
    lowConfidence: false,
    updatedAt: '',
  },
  bySources: [],
  fallback: null,
  ...over,
})

describe('SalaryStore', () => {
  let store: SalaryStore
  const apiClient = { get: vi.fn() as (path: string) => Promise<unknown> }

  beforeEach(() => {
    apiClient.get = vi.fn().mockResolvedValue(bundle())
    store = new SalaryStore(apiClient as never)
  })

  it('fetches and caches by key', async () => {
    const r1 = await store.fetchStats('x', 'DE', 'middle')
    const r2 = await store.fetchStats('x', 'DE', 'middle')
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(r1).toEqual(r2)
  })

  it('separate keys for different filters', async () => {
    await store.fetchStats('x', 'DE', 'middle')
    await store.fetchStats('x', 'DE', 'senior')
    expect(apiClient.get).toHaveBeenCalledTimes(2)
  })

  it('returns null on network error', async () => {
    apiClient.get = vi.fn().mockRejectedValue(new Error('nope'))
    store = new SalaryStore(apiClient as never)
    const r = await store.fetchStats('x', 'DE', 'middle')
    expect(r).toBeNull()
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

```
pnpm --filter frontend vitest run src/stores/SalaryStore.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Реализовать**

`frontend/src/stores/SalaryStore.ts`:

```typescript
import { action, makeObservable, observable, runInAction } from 'mobx'
import type { SalaryStatsResponse } from '@/types/api'
import type { SeniorityEnum } from '@/types/api'

interface ApiClient {
  get(path: string): Promise<unknown>
}

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  bundle: SalaryStatsResponse
  fetchedAt: number
}

export class SalaryStore {
  stats: Map<string, CacheEntry> = new Map()

  constructor(private api: ApiClient) {
    makeObservable(this, {
      stats: observable,
      fetchStats: action,
      clear: action,
    })
  }

  private key(spec: string, country: string, seniority: SeniorityEnum | 'any'): string {
    return `${spec}|${country}|${seniority}`
  }

  async fetchStats(
    spec: string,
    country: string,
    seniority: SeniorityEnum | 'any'
  ): Promise<SalaryStatsResponse | null> {
    const k = this.key(spec, country, seniority)
    const cached = this.stats.get(k)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.bundle

    try {
      const q = new URLSearchParams({ specialization: spec, country, seniority })
      const bundle = (await this.api.get(`/salary-stats?${q.toString()}`)) as SalaryStatsResponse
      runInAction(() => {
        this.stats.set(k, { bundle, fetchedAt: Date.now() })
      })
      return bundle
    } catch {
      return null
    }
  }

  clear(): void {
    this.stats.clear()
  }
}
```

- [ ] **Step 4: Добавить в `RootStore`**

Открыть `frontend/src/stores/RootStore.ts`, добавить импорт и поле:

```typescript
import { SalaryStore } from './SalaryStore'
// ...
export class RootStore {
  // ... existing stores
  salary: SalaryStore

  constructor(apiClient: ApiClient) {
    // ... existing initializations
    this.salary = new SalaryStore(apiClient)
  }
}
```

Точное имя API-клиента и паттерн передачи в конструктор — смотреть в существующем `RootStore.ts` (использовать тот же паттерн, что и для `AnalyticsStore`).

- [ ] **Step 5: Тесты проходят**

```
pnpm --filter frontend vitest run src/stores/SalaryStore.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 6: Тайп-чекер зелёный**

```
pnpm --filter frontend tsc --noEmit
```

Expected: 0 ошибок.

- [ ] **Step 7: Коммит**

```
git add frontend/src/stores/SalaryStore.ts \
        frontend/src/stores/SalaryStore.test.ts \
        frontend/src/stores/RootStore.ts
git commit -m "feat(salary): SalaryStore — MobX кэш ответа /salary-stats"
```

---

## Task 16: Frontend — `MarketPositionBadge`

**Files:**

- Create: `frontend/src/components/salary/MarketPositionBadge.tsx`
- Create: `frontend/src/components/salary/MarketPositionBadge.test.tsx`
- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`

- [ ] **Step 1: Добавить i18n ключи**

`frontend/src/locales/ru/common.json` — в объект (в конец, до закрывающей `}`):

```json
"salary": {
  "title": "Зарплаты",
  "marketPosition": {
    "below": "Ниже рынка",
    "in_range": "В рынке",
    "above": "Выше рынка",
    "insufficient": "Недостаточно данных"
  },
  "percentile": {
    "p25": "P25",
    "median": "Медиана",
    "p75": "P75"
  },
  "sampleSize": "Выборка",
  "updatedAt": "Обновлено",
  "fallback": {
    "notice": "Точных данных по этой специализации нет. Средняя зарплата по стране"
  },
  "vacancyMid": "Ваша вакансия"
}
```

`frontend/src/locales/en/common.json` — аналогично:

```json
"salary": {
  "title": "Salaries",
  "marketPosition": {
    "below": "Below market",
    "in_range": "In range",
    "above": "Above market",
    "insufficient": "Not enough data"
  },
  "percentile": {
    "p25": "P25",
    "median": "Median",
    "p75": "P75"
  },
  "sampleSize": "Sample size",
  "updatedAt": "Updated",
  "fallback": {
    "notice": "No specific data for this specialization. Country average shown"
  },
  "vacancyMid": "This vacancy"
}
```

- [ ] **Step 2: Failing тест**

`frontend/src/components/salary/MarketPositionBadge.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarketPositionBadge } from './MarketPositionBadge'

describe('MarketPositionBadge', () => {
  it('renders "Below market" for below status', () => {
    render(<MarketPositionBadge status="below" />)
    expect(screen.getByText(/below market/i)).toBeInTheDocument()
  })

  it('renders "In range" for in_range', () => {
    render(<MarketPositionBadge status="in_range" />)
    expect(screen.getByText(/in range/i)).toBeInTheDocument()
  })

  it('renders "Above market" for above', () => {
    render(<MarketPositionBadge status="above" />)
    expect(screen.getByText(/above market/i)).toBeInTheDocument()
  })

  it('renders "Not enough data" for insufficient', () => {
    render(<MarketPositionBadge status="insufficient_data" />)
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument()
  })

  it('applies status-specific classes', () => {
    const { rerender } = render(<MarketPositionBadge status="below" />)
    expect(screen.getByTestId('market-position-badge')).toHaveAttribute(
      'data-status',
      'below',
    )
    rerender(<MarketPositionBadge status="above" />)
    expect(screen.getByTestId('market-position-badge')).toHaveAttribute(
      'data-status',
      'above',
    )
  })
})
```

_Примечание:_ тест использует английские строки — убедиться, что тестовая i18n конфигурация во frontend/vitest.config стартует с `en` (иначе адаптировать под RU). Если тесты уже используют `en` по умолчанию (см. соседние тесты компонент) — оставить как есть.

- [ ] **Step 3: Убедиться, что падает**

```
pnpm --filter frontend vitest run src/components/salary/MarketPositionBadge.test.tsx
```

Expected: FAIL.

- [ ] **Step 4: Реализовать**

`frontend/src/components/salary/MarketPositionBadge.tsx`:

```tsx
'use client'
import { useTranslation } from 'react-i18next'
import { marketPositionLabelKey } from '@/lib/salary-utils'
import type { MarketPositionStatus } from '@/types/api'

const STATUS_CLASSES: Record<MarketPositionStatus, string> = {
  below:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900',
  in_range:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900',
  above:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900',
  insufficient_data: 'bg-muted text-muted-foreground border-border',
}

const STATUS_SYMBOL: Record<MarketPositionStatus, string> = {
  below: '↓',
  in_range: '✓',
  above: '↑',
  insufficient_data: '?',
}

export function MarketPositionBadge({ status }: { status: MarketPositionStatus }) {
  const { t } = useTranslation('common')
  return (
    <span
      data-testid="market-position-badge"
      data-status={status}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      <span aria-hidden>{STATUS_SYMBOL[status]}</span>
      {t(marketPositionLabelKey(status))}
    </span>
  )
}
```

- [ ] **Step 5: Тесты проходят**

```
pnpm --filter frontend vitest run src/components/salary/MarketPositionBadge.test.tsx
```

Expected: 5/5 PASS.

- [ ] **Step 6: Коммит**

```
git add frontend/src/components/salary/MarketPositionBadge.tsx \
        frontend/src/components/salary/MarketPositionBadge.test.tsx \
        frontend/src/locales/ru/common.json \
        frontend/src/locales/en/common.json
git commit -m "feat(salary): MarketPositionBadge + i18n-ключи salary.*"
```

---

## Task 17: Frontend — `SalaryDistributionChart` (mini)

**Files:**

- Create: `frontend/src/components/salary/SalaryDistributionChart.tsx`
- Create: `frontend/src/components/salary/SalaryDistributionChart.test.tsx`

- [ ] **Step 1: Failing тест**

`frontend/src/components/salary/SalaryDistributionChart.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SalaryDistributionChart } from './SalaryDistributionChart'

describe('SalaryDistributionChart', () => {
  it('renders P25/P50/P75 labels', () => {
    render(
      <SalaryDistributionChart
        p25Usd={3200}
        p50Usd={4100}
        p75Usd={5100}
        vacancyMidUsd={3500}
      />,
    )
    expect(screen.getByText(/\$3,200/i)).toBeInTheDocument()
    expect(screen.getByText(/\$4,100/i)).toBeInTheDocument()
    expect(screen.getByText(/\$5,100/i)).toBeInTheDocument()
  })

  it('renders without vacancyMidUsd', () => {
    const { container } = render(
      <SalaryDistributionChart p25Usd={3200} p50Usd={4100} p75Usd={5100} />,
    )
    expect(container).toBeTruthy()
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

```
pnpm --filter frontend vitest run src/components/salary/SalaryDistributionChart.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Реализовать (без recharts — простой SVG для mini варианта)**

`frontend/src/components/salary/SalaryDistributionChart.tsx`:

```tsx
'use client'
import { formatUsd } from '@/lib/salary-utils'

interface Props {
  p25Usd: number
  p50Usd: number
  p75Usd: number
  vacancyMidUsd?: number
}

export function SalaryDistributionChart({ p25Usd, p50Usd, p75Usd, vacancyMidUsd }: Props) {
  const min = Math.min(p25Usd, vacancyMidUsd ?? p25Usd) * 0.9
  const max = Math.max(p75Usd, vacancyMidUsd ?? p75Usd) * 1.1
  const range = max - min
  const pos = (v: number) => ((v - min) / range) * 100

  return (
    <div className="w-full">
      <div className="relative h-10 rounded-md bg-muted/40">
        {/* P25→P75 range */}
        <div
          className="absolute top-1/2 h-4 -translate-y-1/2 rounded-sm bg-blue-200/60 dark:bg-blue-900/40"
          style={{ left: `${pos(p25Usd)}%`, width: `${pos(p75Usd) - pos(p25Usd)}%` }}
          data-testid="chart-p25-p75-range"
        />
        {/* P50 line */}
        <div
          className="absolute top-0 h-full w-0.5 bg-blue-600 dark:bg-blue-400"
          style={{ left: `${pos(p50Usd)}%` }}
          data-testid="chart-p50-line"
        />
        {/* Vacancy mid marker */}
        {vacancyMidUsd !== undefined && (
          <div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background"
            style={{ left: `${pos(vacancyMidUsd)}%` }}
            data-testid="chart-vacancy-marker"
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{formatUsd(p25Usd)}</span>
        <span className="font-medium text-foreground">{formatUsd(p50Usd)}</span>
        <span>{formatUsd(p75Usd)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Тесты проходят**

```
pnpm --filter frontend vitest run src/components/salary/SalaryDistributionChart.test.tsx
```

Expected: 2/2 PASS.

- [ ] **Step 5: Коммит**

```
git add frontend/src/components/salary/SalaryDistributionChart.tsx \
        frontend/src/components/salary/SalaryDistributionChart.test.tsx
git commit -m "feat(salary): SalaryDistributionChart — mini SVG-вариант"
```

---

## Task 18: Показать badge + chart на карточке вакансии

**Files:**

- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`

- [ ] **Step 1: Прочитать текущий файл**

```
grep -n "salaryFrom\|salaryTo\|salaryCurrency" frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx | head
```

Найти блок, где рендерится зарплата.

- [ ] **Step 2: Добавить импорты и блок под зарплатой**

Импорты в начале файла:

```tsx
import { MarketPositionBadge } from '@/components/salary/MarketPositionBadge'
import { SalaryDistributionChart } from '@/components/salary/SalaryDistributionChart'
import { formatUsd } from '@/lib/salary-utils'
import { useTranslation } from 'react-i18next'
```

Найти секцию, где выводится зарплата (обычно рядом с `formatSalary(vacancy)`), и **сразу после неё** добавить условный рендер:

```tsx
{
  vacancy.marketPosition && vacancy.marketPosition.status !== 'insufficient_data' && (
    <div className="mt-3 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <MarketPositionBadge status={vacancy.marketPosition.status} />
        {vacancy.marketPosition.vacancyMidUsd !== undefined && (
          <span className="text-sm text-muted-foreground">
            {t('salary.vacancyMid')}: {formatUsd(vacancy.marketPosition.vacancyMidUsd)}
          </span>
        )}
      </div>
      {vacancy.marketPosition.referenceP25Usd !== undefined &&
        vacancy.marketPosition.referenceP50Usd !== undefined &&
        vacancy.marketPosition.referenceP75Usd !== undefined && (
          <>
            <SalaryDistributionChart
              p25Usd={vacancy.marketPosition.referenceP25Usd}
              p50Usd={vacancy.marketPosition.referenceP50Usd}
              p75Usd={vacancy.marketPosition.referenceP75Usd}
              vacancyMidUsd={vacancy.marketPosition.vacancyMidUsd}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('salary.sampleSize')}: {vacancy.marketPosition.referenceSampleSize}
            </p>
          </>
        )}
    </div>
  )
}
```

И добавить `const { t } = useTranslation('common')` в начале компонента, если ещё нет.

- [ ] **Step 3: Тайп-чекер зелёный**

```
pnpm --filter frontend tsc --noEmit
```

Expected: 0 ошибок.

- [ ] **Step 4: Ручная проверка (dev-сервер)**

```
pnpm --filter backend develop &
pnpm --filter frontend dev &
sleep 20
# открыть в браузере http://localhost:3000/vacancies/<любой published id>
# должен либо не показывать блок (insufficient_data), либо показать badge+chart
kill %1 %2
```

Expected: страница не крешит; блок либо есть, либо нет (в зависимости от того, есть ли данные в SalaryStat).

- [ ] **Step 5: Коммит**

```
git add frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx
git commit -m "feat(salary): показать MarketPositionBadge + Chart на карточке вакансии"
```

---

## Task 19: `useMarketPosition` hook

**Files:**

- Create: `frontend/src/hooks/useMarketPosition.ts`
- Create: `frontend/src/hooks/useMarketPosition.test.ts`

- [ ] **Step 1: Failing тест**

`frontend/src/hooks/useMarketPosition.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMarketPosition } from './useMarketPosition'
import type { SalaryStatsResponse } from '@/types/api'

const bundle = (): SalaryStatsResponse => ({
  specialization: { slug: 'x', name: { ru: 'X', en: 'X' } },
  country: 'DE',
  seniority: 'middle',
  combined: {
    p25Usd: 3000,
    p50Usd: 4000,
    p75Usd: 5000,
    sampleSize: 100,
    lowConfidence: false,
    updatedAt: '',
  },
  bySources: [],
  fallback: null,
})

describe('useMarketPosition', () => {
  it('fetches stats and computes position', async () => {
    const fetchStats = vi.fn().mockResolvedValue(bundle())
    const { result } = renderHook(() =>
      useMarketPosition({
        fetchStats,
        specializationSlug: 'x',
        country: 'DE',
        seniority: 'middle',
        salaryFrom: 3500,
        salaryTo: 4500,
        salaryCurrency: 'USD',
      })
    )
    await waitFor(() => expect(result.current.position?.status).toBe('in_range'))
  })

  it('returns null when specialization or country missing', async () => {
    const fetchStats = vi.fn()
    const { result } = renderHook(() =>
      useMarketPosition({
        fetchStats,
        specializationSlug: '',
        country: 'DE',
        seniority: 'middle',
        salaryFrom: 3500,
        salaryTo: 4500,
        salaryCurrency: 'USD',
      })
    )
    expect(result.current.position).toBeNull()
    expect(fetchStats).not.toHaveBeenCalled()
  })

  it('recomputes position without new fetch when only salary changes', async () => {
    const fetchStats = vi.fn().mockResolvedValue(bundle())
    const { result, rerender } = renderHook((props: any) => useMarketPosition(props), {
      initialProps: {
        fetchStats,
        specializationSlug: 'x',
        country: 'DE',
        seniority: 'middle',
        salaryFrom: 3500,
        salaryTo: 4500,
        salaryCurrency: 'USD',
      },
    })
    await waitFor(() => expect(result.current.position?.status).toBe('in_range'))

    rerender({
      fetchStats,
      specializationSlug: 'x',
      country: 'DE',
      seniority: 'middle',
      salaryFrom: 1500,
      salaryTo: 2000,
      salaryCurrency: 'USD',
    })

    await waitFor(() => expect(result.current.position?.status).toBe('below'))
    expect(fetchStats).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

```
pnpm --filter frontend vitest run src/hooks/useMarketPosition.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Реализовать**

`frontend/src/hooks/useMarketPosition.ts`:

```typescript
import { useEffect, useMemo, useRef, useState } from 'react'
import { computeLocalPosition } from '@/lib/salary-utils'
import type { MarketPosition, SalaryStatsResponse, SeniorityEnum } from '@/types/api'

const FX_APPROX: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  RUB: 0.011,
  GBP: 1.27,
}

function midUsd(from: number | null, to: number | null, currency: string): number | null {
  if (!from && !to) return null
  const raw = from && to ? (from + to) / 2 : (from ?? to)!
  const rate = FX_APPROX[currency] ?? 1
  return Math.round(raw * rate)
}

interface Params {
  fetchStats: (
    spec: string,
    country: string,
    seniority: SeniorityEnum | 'any'
  ) => Promise<SalaryStatsResponse | null>
  specializationSlug: string
  country: string
  seniority: SeniorityEnum | 'any'
  salaryFrom: number | null
  salaryTo: number | null
  salaryCurrency: string
}

export function useMarketPosition(p: Params): {
  position: MarketPosition | null
  stats: SalaryStatsResponse | null
} {
  const [stats, setStats] = useState<SalaryStatsResponse | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastKey = useRef<string>('')

  useEffect(() => {
    if (!p.specializationSlug || !p.country) {
      setStats(null)
      return
    }
    const key = `${p.specializationSlug}|${p.country}|${p.seniority}`
    if (key === lastKey.current) return
    lastKey.current = key

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      const r = await p.fetchStats(p.specializationSlug, p.country, p.seniority)
      setStats(r)
    }, 500)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [p.fetchStats, p.specializationSlug, p.country, p.seniority])

  const position = useMemo<MarketPosition | null>(() => {
    if (!p.specializationSlug || !p.country) return null
    const mid = midUsd(p.salaryFrom, p.salaryTo, p.salaryCurrency)
    if (mid === null) return null
    return computeLocalPosition(mid, stats?.combined ?? null)
  }, [stats, p.salaryFrom, p.salaryTo, p.salaryCurrency, p.specializationSlug, p.country])

  return { position, stats }
}
```

- [ ] **Step 4: Тесты проходят**

```
pnpm --filter frontend vitest run src/hooks/useMarketPosition.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 5: Коммит**

```
git add frontend/src/hooks/useMarketPosition.ts \
        frontend/src/hooks/useMarketPosition.test.ts
git commit -m "feat(salary): useMarketPosition — debounced fetch + локальный пересчёт"
```

---

## Task 20: `MarketPositionInline` компонент

**Files:**

- Create: `frontend/src/components/salary/MarketPositionInline.tsx`
- Create: `frontend/src/components/salary/MarketPositionInline.test.tsx`

- [ ] **Step 1: Failing тест**

`frontend/src/components/salary/MarketPositionInline.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarketPositionInline } from './MarketPositionInline'

describe('MarketPositionInline', () => {
  it('renders nothing when position is null', () => {
    const { container } = render(<MarketPositionInline position={null} stats={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders insufficient block when status insufficient_data', () => {
    render(
      <MarketPositionInline
        position={{ status: 'insufficient_data', vacancyMidUsd: 3500 }}
        stats={null}
      />,
    )
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument()
  })

  it('renders full block with badge, market range, sample size', () => {
    render(
      <MarketPositionInline
        position={{
          status: 'below',
          vacancyMidUsd: 2500,
          referenceP25Usd: 3000,
          referenceP50Usd: 4000,
          referenceP75Usd: 5000,
          referenceSampleSize: 47,
        }}
        stats={null}
      />,
    )
    expect(screen.getByText(/below market/i)).toBeInTheDocument()
    expect(screen.getByText(/\$3,000/)).toBeInTheDocument()
    expect(screen.getByText(/47/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Убедиться, что падает**

```
pnpm --filter frontend vitest run src/components/salary/MarketPositionInline.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Реализовать**

`frontend/src/components/salary/MarketPositionInline.tsx`:

```tsx
'use client'
import { useTranslation } from 'react-i18next'
import { MarketPositionBadge } from './MarketPositionBadge'
import { SalaryDistributionChart } from './SalaryDistributionChart'
import { formatUsd } from '@/lib/salary-utils'
import type { MarketPosition, SalaryStatsResponse } from '@/types/api'

interface Props {
  position: MarketPosition | null
  stats: SalaryStatsResponse | null
}

export function MarketPositionInline({ position, stats }: Props) {
  const { t } = useTranslation('common')
  if (!position) return null

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <MarketPositionBadge status={position.status} />
        {position.vacancyMidUsd !== undefined && (
          <span className="text-muted-foreground">
            {t('salary.vacancyMid')}: {formatUsd(position.vacancyMidUsd)}
          </span>
        )}
      </div>
      {position.status !== 'insufficient_data' &&
        position.referenceP25Usd !== undefined &&
        position.referenceP50Usd !== undefined &&
        position.referenceP75Usd !== undefined && (
          <>
            <SalaryDistributionChart
              p25Usd={position.referenceP25Usd}
              p50Usd={position.referenceP50Usd}
              p75Usd={position.referenceP75Usd}
              vacancyMidUsd={position.vacancyMidUsd}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('salary.sampleSize')}: {position.referenceSampleSize}
              {stats?.combined?.updatedAt && (
                <>
                  {' '}
                  • {t('salary.updatedAt')}:{' '}
                  {new Date(stats.combined.updatedAt).toLocaleDateString()}
                </>
              )}
            </p>
          </>
        )}
    </div>
  )
}
```

- [ ] **Step 4: Тесты проходят**

```
pnpm --filter frontend vitest run src/components/salary/MarketPositionInline.test.tsx
```

Expected: 3/3 PASS.

- [ ] **Step 5: Коммит**

```
git add frontend/src/components/salary/MarketPositionInline.tsx \
        frontend/src/components/salary/MarketPositionInline.test.tsx
git commit -m "feat(salary): MarketPositionInline — блок для формы вакансии"
```

---

## Task 21: Подключить `MarketPositionInline` в форму вакансии

**Files:**

- Modify: `frontend/src/components/vacancy/VacancyForm.tsx`

- [ ] **Step 1: Найти поле salary**

```
grep -n "salaryFrom\|salaryTo\|salaryCurrency" frontend/src/components/vacancy/VacancyForm.tsx | head
```

- [ ] **Step 2: Подключить hook + компонент**

Импорты:

```tsx
import { useMarketPosition } from '@/hooks/useMarketPosition'
import { MarketPositionInline } from '@/components/salary/MarketPositionInline'
import { useRootStore } from '@/stores/StoreProvider'
```

Внутри компонента (перед return, после `watch/useForm` — точный паттерн зависит от текущего кода, но `VacancyForm` использует React Hook Form + Zod):

```tsx
const { salary } = useRootStore()
const salaryFrom = watch('salaryFrom')
const salaryTo = watch('salaryTo')
const salaryCurrency = watch('salaryCurrency')
const country = watch('country')
const specializationId = watch('specializationId') // название поля см. в существующей форме
const seniority = watch('seniority')

// resolve specialization slug (форма хранит id, а hook ждёт slug)
// проще всего: если vacancyForm уже загружает список specializations в стор,
// найти slug по id прямо тут:
const { industry } = useRootStore()
const specSlug = useMemo(() => {
  for (const ind of industry.industries) {
    const s = ind.specializations?.find((x: any) => x.id === specializationId)
    if (s) return s.slug
  }
  return ''
}, [specializationId, industry.industries])

const singleSeniority: SeniorityEnum | 'any' =
  Array.isArray(seniority) && seniority.length === 1 ? seniority[0] : 'any'

const { position, stats } = useMarketPosition({
  fetchStats: salary.fetchStats.bind(salary),
  specializationSlug: specSlug,
  country: country ?? '',
  seniority: singleSeniority,
  salaryFrom: salaryFrom ?? null,
  salaryTo: salaryTo ?? null,
  salaryCurrency: salaryCurrency ?? 'USD',
})
```

Точное имя store для отраслей/специализаций (`industry`, `industryStore`) и способ получить slug — смотреть в существующем коде формы. Если структура отличается — адаптировать под неё.

Ниже полей зарплаты (после `salaryCurrency` контрола):

```tsx
<MarketPositionInline position={position} stats={stats} />
```

- [ ] **Step 3: Тайп-чекер зелёный**

```
pnpm --filter frontend tsc --noEmit
```

Expected: 0 ошибок.

- [ ] **Step 4: Ручная проверка**

```
pnpm --filter backend develop &
pnpm --filter frontend dev &
sleep 20
# в браузере: dashboard/vacancies/new → заполнить specialization, country, seniority, salaryFrom/To
# должен появиться блок MarketPositionInline (даже если insufficient_data)
kill %1 %2
```

Expected: блок появляется под полями зарплаты; при изменении цифр — обновляется без нового fetch.

- [ ] **Step 5: Коммит**

```
git add frontend/src/components/vacancy/VacancyForm.tsx
git commit -m "feat(salary): подключить MarketPositionInline в форму создания вакансии"
```

---

## Task 22: Финальная проверка

- [ ] **Step 1: Все тесты**

```
pnpm --filter backend jest
pnpm --filter frontend vitest run
```

Expected: обе команды — 0 failed.

- [ ] **Step 2: Тайп-чекер (оба пакета)**

```
pnpm --filter backend tsc --noEmit
pnpm --filter frontend tsc --noEmit
```

Expected: 0 ошибок в обоих.

- [ ] **Step 3: Ручной запуск ETL один раз (dev)**

Через Strapi console:

```
docker compose up -d
pnpm --filter backend develop &
sleep 20

pnpm --filter backend console -- --exec "
  const { runSalaryEtl } = require('./src/services/salary/etl')
  runSalaryEtl(strapi).then(s => { console.log(JSON.stringify(s, null, 2)); process.exit(0) })
"
```

Expected: summary JSON, `world_bank.records` > 0 (страны прошли), `gramjob.records` — сколько получилось из наших вакансий.

- [ ] **Step 4: Убедиться, что БД заполнилась**

```
docker compose exec postgres psql -U gramjob -d gramjob -c "SELECT source, COUNT(*) FROM salary_stats GROUP BY source"
docker compose exec postgres psql -U gramjob -d gramjob -c "SELECT COUNT(*) FROM country_fallback_stats"
```

Expected: как минимум `country_fallback_stats` > 0.

- [ ] **Step 5: Проверить API вернул fallback**

```
curl -s "http://localhost:1337/salary-stats?specialization=frontend-developer&country=DE&seniority=middle" | jq
```

Expected: если `combined: null`, то `fallback: { source: 'world_bank', ... }`.

- [ ] **Step 6: Проверить UI на локальном dev-сервере**

Открыть в браузере:

- `/vacancies/<любая published вакансия>` — блок либо отсутствует (insufficient), либо показывает badge+chart.
- `/dashboard/vacancies/new` — при заполнении полей появляется `MarketPositionInline`.

- [ ] **Step 7: Финальный коммит-маркер**

Если нужны косметические правки — сделать их в отдельных коммитах. P1 готов.

---

## Итог

P1 даёт:

- Три content type + миграция + индексы
- FX сервис, aggregator, market-indicator (все с тестами)
- Два адаптера: `gramjob` и `world_bank`
- ETL orchestrator + weekly cron + monthly cleanup
- Публичный `GET /salary-stats` + расширение `GET /vacancies/:id` полем `marketPosition`
- Frontend: типы, `SalaryStore`, `MarketPositionBadge`, `SalaryDistributionChart`, `MarketPositionInline`, hook `useMarketPosition`
- Интеграция в карточку вакансии + форму создания вакансии
- i18n RU/EN

Что дальше (P2): пять внешних источников (Adzuna, SO Survey, BLS, Eurostat, OECD), публичный раздел `/salaries` с фильтрами и таблицами.
