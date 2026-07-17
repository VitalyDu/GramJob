# Salary Insights — дизайн

Дата: 2026-07-17
Статус: draft (готов к ревью пользователя)

## Цель

Показать рыночные диапазоны зарплат по срезу `specialization × country × seniority` в трёх точках интерфейса:

1. **Раздел `/salaries`** — публичная аналитика для кандидатов (SEO-driven).
2. **Форма создания/редактирования вакансии** — инлайн-подсказка «рынок» под полями зарплаты, чтобы работодатель осознанно ставил цифру.
3. **Публичная карточка вакансии `/vacancies/:id`** — индикатор «ниже рынка / в рынке / выше рынка» + мини-график распределения с меткой позиции этой вакансии.

Источник дохода фичи: SEO-трафик на salary-страницы, доверие кандидатов к платформе, повышение качества вакансий (работодатели меньше ставят «на глаз»).

## Ключевые решения

- **Шесть источников**: Adzuna (API), Stack Overflow Developer Survey (CSV), BLS (США), Eurostat (EU), World Bank + OECD (макро-фолбек), собственные данные GramJob.
- **Разделение ETL и чтения.** Weekly cron собирает и агрегирует, публичный API читает из готовой таблицы.
- **Нормализация в USD** на этапе ETL, оригинальные валюты сохраняются в raw-точках.
- **Метрики**: P25 / P50 / P75 + sampleSize (перцентили считаем на пуле сырых точек всех источников — не среднее по средним).
- **Публичный доступ** (без auth) на `/salaries`, `/salary-stats`, `marketPosition` в карточке вакансии.
- **Fallback** через `CountryFallbackStat` (World Bank / OECD) — когда точных данных по specialization нет, показываем среднюю по стране.

## Архитектура

```
┌───────────────────────────────────────────────────────────────────┐
│                    ETL Layer (weekly cron)                        │
│  ┌─────────┐ ┌─────────┐ ┌──────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Adzuna  │ │SO Survey│ │ BLS  │ │ Eurostat │ │ World Bank / │  │
│  │  API    │ │  CSV    │ │ API  │ │   API    │ │  OECD API    │  │
│  └────┬────┘ └────┬────┘ └──┬───┘ └────┬─────┘ └──────┬───────┘  │
│       │           │         │          │              │          │
│       ▼           ▼         ▼          ▼              ▼          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Adapter per source (нормализация в общий SalaryDataPoint) │  │
│  │  • маппинг specialization через configs/*.json             │  │
│  │  • конвертация валюты в USD (курс дня)                     │  │
│  │  • дедуп + отбраковка выбросов (IQR filter)                │  │
│  └───────────────────────┬────────────────────────────────────┘  │
│                          │                                        │
│  ┌───────────────────┐   │  ┌──────────────────────────────┐     │
│  │ Own vacancies +   ├───┤  │  salary-aggregator service   │     │
│  │ resumes (SQL)     │   └─▶│  • группирует по key         │     │
│  └───────────────────┘      │  • считает P25 / P50 / P75   │     │
│                             │  • sample_size, updatedAt    │     │
│                             └──────────────┬───────────────┘     │
└────────────────────────────────────────────┼─────────────────────┘
                                             ▼
                             ┌─────────────────────────────┐
                             │  SalaryStat (Strapi)        │  ← key:
                             │  + SalaryDataPoint (raw)    │   source × spec
                             │  + CountryFallbackStat      │      × country
                             │    (World Bank/OECD level)  │      × seniority
                             └────────────┬────────────────┘
                                          ▼
              ┌───────────────────────────────────────────────┐
              │  GET /salary-stats?spec=X&country=Y&sen=Z     │  публичный
              │  • объединяет источники                       │
              │  • при отсутствии → country fallback          │
              │  • возвращает per-source breakdown + combined │
              └───────┬───────────────────────┬───────────────┘
                      ▼                       ▼
        ┌───────────────────────┐  ┌────────────────────────┐
        │  /salaries            │  │  Vacancy page:         │
        │  (публичный раздел)   │  │  • Market Indicator    │
        │  + форма вакансии     │  │    (ниже/в/выше рынка) │
        │  (инлайн подсказка)   │  │  • Mini distribution   │
        │                       │  │    chart с меткой      │
        │                       │  │    «эта вакансия»      │
        └───────────────────────┘  └────────────────────────┘
```

## Модель данных

### `SalaryStat`

Агрегированные перцентили. То, что читает публичный API.

```json
{
  "collectionName": "salary_stats",
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
    "country": { "type": "string", "required": true },
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

Уникальный индекс (bootstrap-миграция):

```sql
CREATE UNIQUE INDEX salary_stats_key
  ON salary_stats (source, specialization_id, country, seniority);
```

### `SalaryDataPoint`

Сырые точки — для аудита, пересчёта без похода к источнику, ротации.

```json
{
  "collectionName": "salary_data_points",
  "attributes": {
    "source": { "type": "enumeration", "enum": [...], "required": true },
    "specialization": { "type": "relation", ... },
    "country": { "type": "string", "required": true },
    "seniority": { "type": "enumeration", "enum": [...] },
    "salaryUsd": { "type": "integer", "required": true },
    "salaryOriginal": { "type": "integer" },
    "currencyOriginal": { "type": "string" },
    "exchangeRate": { "type": "decimal" },
    "externalRef": { "type": "string" },
    "collectedAt": { "type": "datetime", "required": true }
  }
}
```

Индекс: `(source, specialization_id, country, collectedAt)`.
Ротация: точки старше 180 дней удаляются ежемесячным cron. Исключение — `so_survey` (годовой снапшот из статического CSV); для этого источника перед bulk-insert делаем `DELETE WHERE source='so_survey'` и вставляем свежий snapshot целиком.

### `CountryFallbackStat`

Макро-данные World Bank / OECD (страна без specialization).

```json
{
  "collectionName": "country_fallback_stats",
  "attributes": {
    "source": { "type": "enumeration", "enum": ["world_bank", "oecd"], "required": true },
    "country": { "type": "string", "required": true },
    "avgAnnualUsd": { "type": "integer", "required": true },
    "medianAnnualUsd": { "type": "integer" },
    "year": { "type": "integer", "required": true },
    "aggregatedAt": { "type": "datetime", "required": true }
  }
}
```

Уникальный индекс: `(source, country, year)`.

### Мапинги источник↔specialization

Хранятся в git (`backend/src/services/salary/mappings/`), правятся PR-ами:

- `adzuna-categories.json` — `{ "IT Jobs": ["frontend-developer", ...] }`
- `so-survey-devtypes.json` — `{ "Fullstack developer": ["fullstack-developer"] }`
- `bls-soc.json` — `{ "15-1252": ["software-engineer"] }` (SOC-код → slugs)
- `eurostat-isco.json` — `{ "2512": ["software-engineer"] }` (ISCO-код → slugs)
- `currency-fallback.json` — фолбек-курсы при недоступности `exchangerate.host`

Формат: один внешний код → массив наших specialization-slugs.

### Расширение существующих типов

- `Vacancy` — **новых полей не добавляем**. `marketPosition` вычисляется на лету при отдаче карточки (join `SalaryStat` в контроллере).
- `Specialization` — добавляем nullable-поля `bls_soc_code`, `eurostat_isco_code`, `adzuna_category`, `so_devtype` (для точечных правок в Strapi Admin).

### Начальный seed

При первом запуске (bootstrap-шаг): World Bank per-country (~200 стран), Eurostat топ-специализации × 28 EU стран, BLS топ-специализации × US. Adzuna и наш `gramjob` — при первом cron.

## Backend

### Структура

```
backend/src/
  api/
    salary-stat/           # content type + публичный GET /salary-stats
    salary-data-point/     # content type (админ, не публичный)
    country-fallback-stat/ # content type + fallback lookup service
  services/salary/
    adapters/
      adzuna.ts
      so-survey.ts
      bls.ts
      eurostat.ts
      world-bank.ts
      oecd.ts
      gramjob.ts
      types.ts
    mappings/
    aggregator.ts          # percentiles, IQR, upsert
    fx.ts                  # конвертация валют, кэш курсов
    market-indicator.ts    # below/in/above для вакансий
    __tests__/
  cron/
    salary-etl.ts          # weekly cron
    salary-data-cleanup.ts # ежемесячно
```

### Adapter interface

```typescript
export interface SalarySourceAdapter {
  source: SalarySource
  fetch(input: {
    specializationSlug: string
    country: string
    seniority?: Seniority
  }): Promise<RawSalaryPoint[]>
  isAvailableFor(country: string): boolean
}

export interface RawSalaryPoint {
  salaryUsd: number
  salaryOriginal?: number
  currencyOriginal?: string
  seniority?: Seniority
  externalRef?: string
  collectedAt: Date
}
```

### Aggregator

1. Взять `SalaryDataPoint` за окно 90 дней для `(source, spec, country, seniority)`.
2. IQR outlier filter (Тьюки 1.5·IQR): отбросить точки за `[P25 − 1.5·IQR, P75 + 1.5·IQR]`.
3. Пересчитать P25/P50/P75 на очищенном массиве.
4. Записать `sampleSize` — количество точек **после** фильтра.
5. `sampleSize < 10` → запись сохраняется, флаг `lowConfidence = true` на клиенте.
6. Sanity-limits: `salaryUsd > 500000` или `< 500` в год → игнор.

### ETL flow (weekly cron, среда 02:00 UTC)

```
for each specialization (87):
  for each country (топ ~30):
    for each source (кроме gramjob):
      if source.isAvailableFor(country):
        rawPoints = source.fetch(spec, country)
        salary_data_point.bulkInsert(rawPoints)
    for each seniority (junior/middle/senior/lead/any):
      for each source (включая gramjob):
        stats = aggregator.recompute(source, spec, country, seniority)
        salary_stat.upsert(stats)

// параллельно
for each country in world_bank_countries (~200):
  fetchWorldBank(country) → country_fallback_stat.upsert
for each country in oecd_countries (~40):
  fetchOECD(country) → country_fallback_stat.upsert
```

**Adzuna rate limit** (250 req/мес): тянем только приоритетные пары. Приоритет — счётчик показов `/salaries` и просмотров вакансий по этому срезу за последние 30 дней; топ-N (N рассчитывается динамически, чтобы уложиться в 250 запросов с запасом на ретраи). Если пара выпала из приоритета — её `SalaryStat` для Adzuna не обновляется, но старая запись остаётся до устаревания. Логика в `adzuna.ts::shouldFetch(spec, country)`.

**Точки без seniority**: если адаптер не может определить seniority (SO Survey частично, World Bank всегда), точка попадает в bucket `seniority='any'`. При запросе `seniority=middle` мы отдаём middle-агрегат, если он есть, иначе fallback на `any`.

**Устойчивость**: каждый адаптер в try/catch, ошибка одного не роняет остальные. Ошибки → `strapi.log.error` + admin-notify через Telegram.

### Публичный API

**`GET /salary-stats`** — публичный, без auth.

Query: `specialization` (slug, обязательно), `country` (код, обязательно), `seniority` (default `any`).

Ответ (успех):

```json
{
  "specialization": { "slug": "frontend-developer", "name": {...} },
  "country": "DE",
  "seniority": "middle",
  "combined": {
    "p25Usd": 3200, "p50Usd": 4100, "p75Usd": 5100,
    "sampleSize": 247,
    "lowConfidence": false,
    "updatedAt": "2026-07-15T02:00:00Z"
  },
  "bySources": [
    { "source": "adzuna",    "p25Usd": 3100, "p50Usd": 4000, "p75Usd": 5000, "sampleSize": 89 },
    { "source": "eurostat",  "p25Usd": 3400, "p50Usd": 4200, "p75Usd": 5300, "sampleSize": 120 },
    { "source": "so_survey", "p25Usd": 3300, "p50Usd": 4150, "p75Usd": 5150, "sampleSize": 32 },
    { "source": "gramjob",   "p25Usd": 3000, "p50Usd": 3900, "p75Usd": 4800, "sampleSize": 6 }
  ],
  "fallback": null
}
```

Ответ (fallback):

```json
{
  "combined": null,
  "bySources": [],
  "fallback": {
    "source": "world_bank",
    "avgAnnualUsd": 55000,
    "note": "Точных данных по этой специализации нет. Средняя зарплата по стране."
  }
}
```

Расчёт `combined`: перцентили на пуле сырых точек всех источников, а не среднее по средним (иначе большой источник топит маленький, но точный собственный).

Кэш: Strapi Cache 5 минут по ключу `spec+country+seniority`.

**`GET /vacancies/:id`** — расширяем ответ полем `marketPosition`:

```json
{
  ...existing fields...,
  "marketPosition": {
    "status": "below" | "in_range" | "above" | "insufficient_data",
    "vacancyMidUsd": 3500,
    "referenceP25Usd": 3200,
    "referenceP50Usd": 4100,
    "referenceP75Usd": 5100,
    "referenceSampleSize": 247
  }
}
```

Логика (`market-indicator.ts`):

- `middle = (salaryFrom + salaryTo) / 2`, конверсия в USD.
- Ищем `SalaryStat combined` по `(specialization, country, seniority)`.
- `sampleSize < 10` → `insufficient_data`.
- Иначе сравнение middle с P25/P75.

Endpoint публичный, ISR 300 сек (существующий паттерн).

### Admin

- `POST /admin/salary/refresh` — принудительный пересчёт (admin only), кнопка Document Action на `Specialization`.
- Админ-страница «Salary ETL» рядом с «Модерацией»: последний прогон, покрытие (сколько (spec×country) заполнены), топ пустых пар.

## Frontend

### Структура

```
frontend/src/
  types/api.ts                          # + salary types
  lib/salary-utils.ts                   # форматтеры, лейблы
  stores/SalaryStore.ts                 # MobX: fetch + кэш
  stores/RootStore.ts                   # + salary
  components/salary/
    SalaryDistributionChart.tsx         # box-plot аналог на recharts
    MarketPositionBadge.tsx             # ↓ / ✓ / ↑ + tooltip
    MarketPositionInline.tsx            # для формы вакансии
    SourceBreakdownTable.tsx            # per-source детали
    InsufficientDataNotice.tsx
    SeniorityComparisonTable.tsx
  app/salaries/
    page.tsx                            # SSR shell
    SalariesClient.tsx                  # фильтры + графики
    [specialization]/[country]/page.tsx # ISR SEO-страницы (топ пары)
  hooks/useMarketPosition.ts            # для формы вакансии
```

### Types

```typescript
export type SalarySource = 'adzuna' | 'so_survey' | 'bls' | 'eurostat' | 'gramjob'
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
  seniority: Seniority | 'any'
  combined: (SalaryPercentiles & { lowConfidence: boolean; updatedAt: string }) | null
  bySources: Array<{ source: SalarySource } & SalaryPercentiles>
  fallback: { source: 'world_bank' | 'oecd'; avgAnnualUsd: number; note: string } | null
}

export interface MarketPosition {
  status: MarketPositionStatus
  vacancyMidUsd?: number
  referenceP25Usd?: number
  referenceP50Usd?: number
  referenceP75Usd?: number
  referenceSampleSize?: number
}

export interface Vacancy {
  // ...
  marketPosition?: MarketPosition
}
```

### UI точки входа

**A. `/vacancies/:id` — карточка вакансии**: `MarketPositionBadge` + `SalaryDistributionChart` (mini). Не показываем при `insufficient_data` (или нейтральный «Недостаточно данных»).

**B. Форма создания/редактирования вакансии**: инлайн `MarketPositionInline` под `salaryFrom/salaryTo`. Hook `useMarketPosition` реагирует на изменения полей (debounce 500 мс), запрашивает `/salary-stats`, локально вычисляет position без нового fetch при изменении цифры.

**C. `/salaries` — публичный раздел**: фильтры (specialization / country / seniority), три большие цифры P25/P50/P75, distribution chart, `SeniorityComparisonTable` (Junior/Middle/Senior/Lead), `SourceBreakdownTable` с per-source детализацией, ссылка на открытые вакансии.

**SEO ISR-страницы** `/salaries/[specialization]/[country]`: предгенерация через `generateStaticParams` для топ-100 пар, revalidate 24ч. `title = "Salary for {spec} in {country} — median $X"`, OG-картинка через route.

**Fallback UI** (когда `combined: null`, есть `fallback`): нейтральный блок с надписью «Точных данных нет. Средняя зарплата по стране: $X (World Bank, YYYY)».

### Chart

`recharts` уже установлен (Sprint 7). `SalaryDistributionChart` — `ComposedChart`: `ReferenceArea` (P25→P75) + `ReferenceLine` (P50) + `ReferenceLine` (текущая вакансия). Полноценный box-plot recharts из коробки не умеет — этой связки достаточно.

### Store

```typescript
class SalaryStore {
  stats: Map<string, SalaryStatsResponse> = new Map() // key = spec+country+seniority
  loading: Set<string> = new Set()
  fetchStats(
    spec: string,
    country: string,
    seniority: Seniority | 'any'
  ): Promise<SalaryStatsResponse | null>
  clear(): void
}
```

Клиентский кэш — Map, TTL 5 мин. Форма вакансии через debounced hook: если ключ уже в Map и свежий — без запроса.

### Тесты

Юнит: `salary-utils.test.ts`, `MarketPositionBadge.test.tsx`, `SalaryDistributionChart.test.tsx`, `SalaryStore.test.ts`, `useMarketPosition.test.ts`.
Интеграционные: `/salaries` рендерит, `insufficient_data` не крешит, fallback UI при `combined: null`.

### i18n

`salary.title`, `salary.marketPosition.{below,in_range,above,insufficient}`, `salary.percentile.{p25,median,p75}`, `salary.sampleSize`, `salary.fallback.notice`, `salary.updatedAt`.

## Конфиг

```
# backend/.env.example
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
BLS_API_KEY=
EUROSTAT_API_URL=https://ec.europa.eu/eurostat/api/dissemination
WORLD_BANK_API_URL=https://api.worldbank.org/v2
OECD_API_URL=https://sdmx.oecd.org/public/rest/data
FX_API_URL=https://api.exchangerate.host

SALARY_ETL_ENABLED=true
SALARY_ETL_CRON=0 2 * * 3
SALARY_CLEANUP_CRON=0 3 1 * *
```

SO Survey — CSV в git (`backend/src/services/salary/data/so-survey-2025.csv`).

## Наблюдаемость

- ETL summary пишем в `moderation_logs` (переиспользуем как generic audit): `{ entityType: 'salary_etl', action: 'run', comment: '{ sources: {...}, duration, errors }' }`.
- Ошибки конкретного адаптера → admin-notify → Telegram.
- Админ-страница «Salary ETL»: последний прогон, покрытие, топ пустых пар.

## Риски

| Риск                                                     | Митигация                                                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Adzuna лимит 250 req/мес — недостаточно на 87×30 срезов  | Приоритезация: топ-15 стран × топ-30 spec (~450 → округлим до 250). BLS/Eurostat/SO Survey покрывают остальное.         |
| Мапинги SOC/ISCO неполные на старте                      | Начинаем с топ-20 популярных пар по существующим вакансиям. Без мапинга → fallback World Bank. Правки — PR.             |
| `exchangerate.host` может лежать / устареть              | Fallback-курсы в `currency-fallback.json`, обновляются раз в квартал; последний успешный курс кэшируется.               |
| Выбросы искажают P50/P75                                 | IQR-фильтр Тьюки 1.5·IQR + sanity-limits `[500, 500 000]` USD/год.                                                      |
| Работодатели манипулируют статистикой                    | `gramjob` считается только по `published` (после модерации). При `sampleSize < 10` наш источник не отдельным breakdown. |
| Adzuna ToS требует attribution                           | Блок «Источники» рендерим на /salaries и в tooltip badge на карточке вакансии.                                          |
| Salary в RUB vs рынок в USD → визуально пугающая разница | В форме показываем «Ваша вакансия ~$X (конверсия)» и «Рынок $Y» — контекст явный.                                       |
| `insufficient_data` в первые месяцы                      | Приоритет ETL на топ-стримы. Фолбек «Недостаточно данных» + ссылка на «Обзор рынка страны» вместо ложного индикатора.   |

## Что НЕ делаем (YAGNI)

- Личная зарплатная история пользователя.
- Публикация анонимных зарплат кандидатами.
- Компенсационные пакеты (equity, bonus, RSU).
- Push-уведомления «зарплаты выросли на X%».
- Salary net calculator (что дают на руки в стране Y при офере $X).

## Порядок реализации

Для писателя плана — логические этапы:

1. **Foundation**: `SalaryStat` / `SalaryDataPoint` / `CountryFallbackStat` content types, миграция, индексы, юнит-тесты схем.
2. **FX + aggregator**: конвертация валют, percentiles, IQR — с юнит-тестами. Без адаптеров.
3. **Adapters по одному**: World Bank → Eurostat → BLS → SO Survey → Adzuna → gramjob. Каждый — свой fixture, свой тест.
4. **Mapping configs** — параллельно с адаптерами.
5. **ETL cron + admin refresh endpoint** + первый ручной прогон.
6. **Публичный `/salary-stats`** + расширение `/vacancies/:id` с `marketPosition`.
7. **Frontend**: types + `SalaryStore` + компоненты. Порядок: сначала `MarketPositionBadge` на карточке вакансии (быстрее ценность), потом форма, потом `/salaries`.
8. **SEO ISR-страницы** `/salaries/[spec]/[country]` — когда данные уже есть.
