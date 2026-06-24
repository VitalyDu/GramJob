# Sprint 3 Frontend — Vacancies Design Spec

**Date:** 2026-06-24  
**Sprint goal:** Работодатель создаёт, публикует и управляет вакансиями. Кандидат ищет вакансии с фильтрами и видит карточку вакансии.

---

## Решения, принятые в ходе брейнсторминга

| Вопрос                           | Решение                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| Редактор richtext-полей          | Простой `<textarea>` (Markdown). Рендеринг через react-markdown |
| Обязательность компании          | `companyId` необязателен (freelancer-кейс)                      |
| Фильтр Industry → Specialization | Каскадные селекты (выбор industry разблокирует specialization)  |
| Infinite scroll                  | IntersectionObserver авто-подгрузка                             |
| Архитектура стейта               | Вариант A: строгий MobX-паттерн Sprint 2                        |

---

## Архитектурный принцип

Следуем паттерну Sprint 2 (Companies) без исключений:

- `page.tsx` — Server Component, обёртка, metadata
- `XxxClient.tsx` — Client Component (`'use client'`), вся логика
- MobX store — данные и async-операции
- `types/api.ts` — все TypeScript-типы сущности
- React Hook Form + Zod — все формы

---

## Секция 1: Типы (`types/api.ts`)

### Enums

```typescript
export type VacancyStatusEnum =
  | 'draft'
  | 'moderation'
  | 'published'
  | 'rejected'
  | 'expired'
  | 'archived'

export type EmploymentTypeEnum = 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance'

export type WorkFormatEnum = 'office' | 'remote' | 'hybrid'

export type SeniorityEnum = 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'principal'

export type SalaryCurrencyEnum = 'USD' | 'EUR' | 'RUB' | 'GBP'

export type SourceTypeEnum = 'internal' | 'external'
```

### Типы Industry/Specialization (добавить в api.ts, если ещё нет)

```typescript
export interface Specialization {
  documentId: string
  slug: string
  name: { ru: string; en: string }
}

export interface Industry {
  documentId: string
  slug: string
  name: { ru: string; en: string }
  specializations?: Specialization[]
}
```

Эти типы нужны для `VacancyFilters` и `VacancyForm`. Если уже определены в кодобазе — использовать существующие.

---

### Вложенные объекты Vacancy

```typescript
export interface VacancyLanguage {
  lang: string
  level: string
}

export interface VacancyPostedBy {
  id: number
  firstName: string
  lastName: string
}

export interface VacancyCompany {
  documentId: string
  name: string
  slug: string
  logo?: StrapiMedia | null
}

export interface VacancyIndustry {
  documentId: string
  slug: string
  name: { ru: string; en: string }
}

export interface VacancySpecialization {
  documentId: string
  slug: string
  name: { ru: string; en: string }
}
```

### Основная сущность

```typescript
export interface Vacancy {
  id: number
  documentId: string
  title: string
  status: VacancyStatusEnum
  sourceType: SourceTypeEnum
  sourceName?: string
  sourceUrl?: string
  employmentType: EmploymentTypeEnum
  workFormat: WorkFormatEnum
  seniority: SeniorityEnum
  country: string
  city?: string
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: SalaryCurrencyEnum
  description: string
  responsibilities: string
  requirements: string
  conditions?: string
  skills?: string[]
  languages?: VacancyLanguage[]
  experienceYears?: number
  urgent: boolean
  topPlacement: boolean
  highlighted: boolean
  views: number
  uniqueViews: number
  applicationsCount: number
  expiresAt?: string | null
  createdAt: string
  industry?: VacancyIndustry
  specialization?: VacancySpecialization
  company?: VacancyCompany | null
  postedBy?: VacancyPostedBy
}
```

### Input-типы

```typescript
export interface VacancyCreateInput {
  title: string
  industryId: string
  specializationId: string
  employmentType: EmploymentTypeEnum
  workFormat: WorkFormatEnum
  seniority: SeniorityEnum
  country: string
  city?: string
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: SalaryCurrencyEnum
  description: string
  responsibilities: string
  requirements: string
  conditions?: string
  skills?: string[]
  languages?: VacancyLanguage[]
  experienceYears?: number
  sourceType?: SourceTypeEnum
  sourceName?: string
  sourceUrl?: string
  urgent?: boolean
  companyId?: string
}

export type VacancyUpdateInput = Partial<VacancyCreateInput>

export interface VacancyListParams {
  search?: string
  industry?: string
  specialization?: string
  country?: string
  city?: string
  workFormat?: WorkFormatEnum
  employmentType?: EmploymentTypeEnum
  seniority?: SeniorityEnum
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: SalaryCurrencyEnum
  sourceType?: SourceTypeEnum
  urgent?: boolean
  topPlacement?: boolean
  sort?: 'newest' | 'salary_asc' | 'salary_desc' | 'relevance'
  page?: number
  pageSize?: number
}
```

### LIMIT_REACHED

```typescript
export interface LimitReachedError {
  code: 'LIMIT_REACHED'
  details: {
    limit: number
    used: number
    resetAt: string
  }
}
```

---

## Секция 2: VacancyStore (`stores/VacancyStore.ts`)

### Состояние

```typescript
class VacancyStore {
  vacancies: Vacancy[] = [] // публичный список (накапливается)
  myVacancies: Vacancy[] = [] // dashboard список (заменяется)
  currentVacancy: Vacancy | null = null
  isLoading = false
  isLoadingMore = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  hasMore = true
}
```

Два отдельных флага загрузки: `isLoading` для первой страницы, `isLoadingMore` для append. Это позволяет не скрывать уже загруженный список при подгрузке следующей страницы.

### Методы

| Метод                                  | Описание                                                               |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `fetchVacancies(params, append=false)` | `append=true` → инкрементирует `page`, добавляет в конец `vacancies[]` |
| `resetVacancies()`                     | Очищает `vacancies`, сбрасывает `page=1`, `hasMore=true`               |
| `fetchMyVacancies(page)`               | Для dashboard, заменяет `myVacancies`                                  |
| `fetchVacancyById(id)`                 | Заполняет `currentVacancy`                                             |
| `createVacancy(input)`                 | POST /vacancies, возвращает созданную                                  |
| `updateVacancy(id, input)`             | PUT /vacancies/:id                                                     |
| `publishVacancy(id)`                   | POST /vacancies/:id/publish, бросает `LimitReachedError` при 403       |
| `boostVacancy(id)`                     | POST /vacancies/:id/boost, бросает `LimitReachedError` при 403         |
| `archiveVacancy(id)`                   | POST /vacancies/:id/archive                                            |

### Infinite scroll protocol

```
При смене фильтров:
  store.resetVacancies()
  store.fetchVacancies(newFilters, false)   → page=1, заменяет список

При достижении sentinel-элемента (IntersectionObserver):
  if (!store.hasMore || store.isLoadingMore) return
  store.fetchVacancies(currentFilters, true) → page++, добавляет

hasMore = (vacancies.length < total)
```

### Тесты (~20 штук)

Тестируем: fetchVacancies с append, resetVacancies, publishVacancy → LimitReachedError, boostVacancy → LimitReachedError, hasMore вычисление. Паттерн: mock `api.*`, runInAction assertions.

---

## Секция 3: Утилиты (`lib/vacancy-utils.ts`)

Метки для enum-значений, используются в UI и форме:

```typescript
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeEnum, string> = {
  'full-time': 'Полная занятость',
  'part-time': 'Частичная занятость',
  contract: 'Контракт',
  internship: 'Стажировка',
  freelance: 'Фриланс',
}

export const WORK_FORMAT_LABELS: Record<WorkFormatEnum, string> = {
  office: 'Офис',
  remote: 'Удалённо',
  hybrid: 'Гибрид',
}

export const SENIORITY_LABELS: Record<SeniorityEnum, string> = {
  intern: 'Intern',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
  principal: 'Principal',
}

export const VACANCY_STATUS_LABELS: Record<VacancyStatusEnum, string> = {
  draft: 'Черновик',
  moderation: 'На модерации',
  published: 'Опубликована',
  rejected: 'Отклонена',
  expired: 'Истекла',
  archived: 'Архив',
}
```

---

## Секция 4: Компоненты

### `VacancyCard`

**Props:** `{ vacancy: Vacancy; showStatus?: boolean }`

Визуальные варианты (не эксклюзивны, применяются по флагам):

- `highlighted` → синяя левая полоса (`border-l-4 border-blue-500 bg-blue-50`)
- `topPlacement` → бейдж 📌 TOP перед заголовком
- `urgent` → жёлтый бейдж 🔥 Urgent в правом углу карточки
- `sourceType === 'external'` → кнопка «Apply on Source» вместо «Apply»
- `showStatus` → рендерит `<VacancyStatusBadge>` под заголовком

Структура:

```
[Лого компании или инициал] | [Заголовок + [📌 TOP]] [🔥 Urgent]
                              [Компания]
                              [Country · WorkFormat · EmploymentType · Seniority]
                              [Зарплата если есть]
                              [VacancyStatusBadge если showStatus]
```

Тесты: рендер без company, с highlighted, с urgent, с external sourceType, показ статуса.

---

### `VacancyFilters`

**Props:** `{ value: VacancyListParams; onChange: (p: VacancyListParams) => void; industries: Industry[] }`

Структура фильтров:

```
[Строка поиска — полная ширина]
[Industry select] → [Specialization select (disabled если industry не выбран)]
[Country input] [WorkFormat select] [EmploymentType select] [Seniority select]
[Salary от: number] [до: number] [Валюта: select USD/EUR/RUB/GBP]
[☑ Только срочные] [☑ Только в топе]
[Сортировка: newest | salary_asc | salary_desc | relevance]
[Кнопка: Сбросить фильтры]
```

**Каскадирование:** при выборе industry — `onChange({ ...value, industry: id, specialization: undefined })`, список специализаций фильтруется из `industries[selected].specializations`.

Тесты: инициализация значений, каскадный сброс specialization при смене industry, вызов onChange.

---

### `VacancyStatusBadge`

Аналог `StatusBadge` для компаний, но с enum вакансий:

| Статус     | Цвет      | Текст        |
| ---------- | --------- | ------------ |
| draft      | серый     | Черновик     |
| moderation | жёлтый    | На модерации |
| published  | зелёный   | Опубликована |
| rejected   | красный   | Отклонена    |
| expired    | оранжевый | Истекла      |
| archived   | серый     | Архив        |

---

### `LimitBar`

**Props:** `{ used: number; limit: number; resetAt: string }`

Отображение:

```
Вакансии: [████░░░░░░] 3 / 10 · сброс через 18 дней
```

- Прогресс-бар: TailwindCSS `bg-blue-500 / bg-gray-200`
- При `used >= limit` → красный прогресс-бар + текст «Лимит исчерпан»
- `resetAt` → вычисляем дней через `Math.ceil((new Date(resetAt) - Date.now()) / 86400000)`

Данные для LimitBar берутся из `authStore.user`: `subscriptionPlan` → лимит из `PLAN_LIMITS` (импорт из констант фронтенда), `vacancyCredits` + использованные в этом месяце. Поскольку у нас нет отдельного endpoint для статистики использования, вычисляем `used = PLAN_LIMITS[plan].vacanciesPerMonth - user.vacancyCredits` как приближение.

> Точный счётчик использованных появится в Sprint 6 вместе с `SubscriptionPlan` content type.

---

### `UpsellModal`

**Props:** `{ open: boolean; onClose: () => void; details?: LimitReachedError['details'] }`

Содержимое (Shadcn `<Dialog>`):

```
🚀 Лимит вакансий исчерпан
У вас план {plan} ({used}/{limit}). Сбрасывается {date}.

[Купить пакет вакансий →]   [Перейти на Pro/Max →]
```

Кнопки — `<Link href="/subscription/packages">` и `<Link href="/subscription">`.

---

### `VacancyForm`

**Props:** `{ initialData?: Vacancy; onSubmit: (data: VacancyCreateInput) => Promise<void>; isLoading?: boolean }`

Zod-схема валидации:

- `title`: min 5, max 200
- `industryId`, `specializationId`: required string
- `employmentType`, `workFormat`, `seniority`: enum
- `country`: required
- `description`, `responsibilities`, `requirements`: min 50
- `salaryFrom`, `salaryTo`: optional number, `salaryTo >= salaryFrom` если оба заданы
- `skills`: max 20 элементов
- `languages`: array of `{ lang: string; level: string }`

Секции формы:

1. **Основное:** title, industry → specialization (каскад, те же industry данные)
2. **Формат:** employmentType, workFormat, seniority (три select в ряд)
3. **Локация:** country (select), city (input, optional)
4. **Зарплата:** salaryFrom, salaryTo, salaryCurrency (три в ряд, все optional)
5. **Описание:** description, responsibilities, requirements (textarea + md-подсказка), conditions (optional)
6. **Дополнительно:** skills (tag-input через управляемый массив), languages (динамические пары), experienceYears
7. **Параметры:** urgent (checkbox), companyId (select из /companies/my, optional)
8. **Итог:** LimitBar (если форма для создания), кнопки Submit / Отмена

**Tag input для skills:** `useFieldArray` из RHF. Поле-ввод отдельное (не регистрируется), при Enter/запятой вызывает `append(value)`. Крестик на теге → `remove(index)`.

---

## Секция 5: Страницы

### `/vacancies` — Публичный каталог

```
app/vacancies/page.tsx         → <VacanciesClient />
app/vacancies/VacanciesClient.tsx
```

`VacanciesClient.tsx` (`'use client'`):

```
useEffect(mount) → store.fetchVacancies({})

<VacancyFilters value={filters} onChange={handleFiltersChange} industries={industries} />
{store.isLoading && <SkeletonList />}
{!store.isLoading && <ul>
  {store.vacancies.map(v => <VacancyCard key={v.documentId} vacancy={v} />)}
</ul>}
<div ref={sentinelRef} />  ← IntersectionObserver здесь
{store.isLoadingMore && <Spinner />}
{!store.hasMore && <p>Все вакансии загружены</p>}
```

`handleFiltersChange`:

```
store.resetVacancies()
setFilters(newFilters)
store.fetchVacancies(newFilters, false)
```

IntersectionObserver:

```
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting && store.hasMore && !store.isLoadingMore) {
    store.fetchVacancies(filters, true)
  }
}, { threshold: 0.1 })
```

---

### `/vacancies/[id]` — Карточка

```
app/vacancies/[id]/page.tsx
app/vacancies/[id]/VacancyDetailClient.tsx
```

При маунте: `store.fetchVacancyById(params.id)`.

Структура страницы:

- Шапка с бейджами (urgent, top, highlighted как стиль)
- Метаданные в таблице: локация, формат, занятость, грейд, опыт, зарплата
- Rich text секции через `react-markdown`: описание, обязанности, требования, условия
- Теги: skills как pills, languages как пары
- Боковой блок (sticky на десктопе):
  - Компания (лого, название, ссылка на `/companies/:slug`)
  - Кнопка Apply (internal → заглушка Sprint 4) или «Apply on Source» → `window.open(sourceUrl, '_blank')`
  - Статус и дата истечения

---

### `/dashboard/vacancies` — Мои вакансии

```
app/dashboard/vacancies/page.tsx
app/dashboard/vacancies/MyVacanciesClient.tsx
```

При маунте: `store.fetchMyVacancies(1)`.

Структура:

```
<LimitBar used={...} limit={...} resetAt={...} />
<a href="/dashboard/vacancies/new">+ Создать вакансию</a>

[Список вакансий: название, статус, дата, views, applicationsCount, действия]
Действия по статусу:
  draft | rejected  → [Отправить на модерацию] [Редактировать] [Архивировать]
  moderation        → [только просмотр]
  published         → [Буст] [Редактировать] [Архивировать]
  expired           → [Переопубликовать (= publish)] [Архивировать]
  archived          → [только просмотр]

Пагинация (стандартная, не infinite scroll — dashboard использует страницы)
```

При `LIMIT_REACHED` от publish/boost → показать `<UpsellModal>`.

---

### `/dashboard/vacancies/new` — Создать вакансию

```
app/dashboard/vacancies/new/page.tsx
app/dashboard/vacancies/new/CreateVacancyClient.tsx
```

`CreateVacancyClient`:

- Загружает industries (из `/industries`) и myCompanies (из `/companies/my`)
- Рендерит `<VacancyForm onSubmit={handleCreate} />`
- `handleCreate` → `store.createVacancy(input)` → redirect на `/dashboard/vacancies`

---

### `/dashboard/vacancies/[id]/edit` — Редактировать

```
app/dashboard/vacancies/[id]/edit/page.tsx
app/dashboard/vacancies/[id]/edit/EditVacancyClient.tsx
```

- Загружает vacancy по id, industries, myCompanies
- Рендерит `<VacancyForm initialData={vacancy} onSubmit={handleUpdate} />`
- `handleUpdate` → `store.updateVacancy(id, input)` → redirect на `/dashboard/vacancies`
- Если статус `moderation/expired/archived` → redirect на dashboard (нельзя редактировать)

---

## Карта всех файлов

**Создать:**

```
frontend/src/
  lib/vacancy-utils.ts
  stores/VacancyStore.ts
  stores/VacancyStore.test.ts
  components/vacancy/
    VacancyCard.tsx
    VacancyCard.test.tsx
    VacancyFilters.tsx
    VacancyFilters.test.tsx
    VacancyForm.tsx
    VacancyForm.test.tsx
    VacancyStatusBadge.tsx
    VacancyStatusBadge.test.tsx
    LimitBar.tsx
    LimitBar.test.tsx
    UpsellModal.tsx
    UpsellModal.test.tsx
  app/vacancies/
    page.tsx
    VacanciesClient.tsx
    VacanciesClient.test.tsx
    [id]/
      page.tsx
      VacancyDetailClient.tsx
      VacancyDetailClient.test.tsx
  app/dashboard/vacancies/
    page.tsx
    MyVacanciesClient.tsx
    MyVacanciesClient.test.tsx
    new/
      page.tsx
      CreateVacancyClient.tsx
      CreateVacancyClient.test.tsx
    [id]/edit/
      page.tsx
      EditVacancyClient.tsx
      EditVacancyClient.test.tsx
```

**Изменить:**

```
frontend/src/types/api.ts         ← +Vacancy типы (append)
frontend/src/stores/RootStore.ts  ← +vacancy: VacancyStore
```

---

## Тестирование

Целевое покрытие: ~35–45 тестов по паттерну Sprint 2.

| Файл                        | Тесты                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| VacancyStore.test.ts        | ~20: fetchVacancies (append/reset), publishVacancy LIMIT_REACHED, boostVacancy LIMIT_REACHED, CRUD |
| VacancyCard.test.tsx        | ~5: default, highlighted, urgent, external (Apply on Source), showStatus                           |
| VacancyFilters.test.tsx     | ~4: инициализация, каскадный сброс specialization, onChange                                        |
| VacancyStatusBadge.test.tsx | ~6: все статусы рендерятся                                                                         |
| LimitBar.test.tsx           | ~4: прогресс, предел исчерпан, дни до сброса                                                       |
| VacancyForm.test.tsx        | ~5: required поля, salaryFrom>salaryTo ошибка, submit                                              |
| VacanciesClient.test.tsx    | ~3: рендер списка, skeleton при загрузке                                                           |
| MyVacanciesClient.test.tsx  | ~3: список, кнопки по статусу                                                                      |

---

## Ограничения и технический долг

- **LimitBar:** Счётчик `used` — приближение через `vacancyCredits`. Точная статистика — Sprint 6.
- **Apply button:** Заглушка на Sprint 4 (Application creation).
- **react-markdown:** Нужно добавить как зависимость (`pnpm add react-markdown`).
- **Industries cache:** Загружаем при каждом маунте формы и фильтров. Кеш — Sprint 10.
- **Dashboard pagination:** Стандартная (кнопки), не infinite scroll.
