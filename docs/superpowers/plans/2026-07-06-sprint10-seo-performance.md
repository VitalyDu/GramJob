# Sprint 10 — SEO & Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Публичные страницы GramJob рендерятся на сервере (SSR/ISR), имеют полные SEO-метаданные (title/description/OG/canonical), sitemap.xml и robots.txt; Lighthouse ≥ 90.

**Architecture:** Данные для публичных страниц (списки и карточки вакансий/компаний) загружаются в серверных компонентах через `lib/server-api.ts` с ISR-кешированием (`next: { revalidate }`) и передаются пропсами в существующие клиентские компоненты — их первый серверный рендер попадает в HTML, интерактив (MobX, отклики, избранное) не меняется. Резюме закрыты Max-подпиской и исключаются из индексации (noindex + robots + отсутствие в sitemap).

**Tech Stack:** Next.js 15 App Router (generateMetadata, sitemap.ts, robots.ts, ISR), next/image, next/font, @next/bundle-analyzer, Lighthouse CLI.

**Ключевые решения:**

- SSR через передачу initial-данных пропсами в существующие client components (client components рендерятся на сервере при первом запросе — проблема была только в том, что данные приходили из `useEffect`).
- Серверный фетч вакансии использует `?skipViewCount=true` (просмотры продолжает считать клиентский фетч — иначе ISR-кеш сломает аналитику).
- Если серверный фетч вернул null (draft/moderation видны только владельцу с JWT) — **не** вызывать `notFound()`, а рендерить как раньше (клиентский фетч с JWT покажет владельцу его черновик).
- `generateMetadata` и page-компонент вызывают один и тот же хелпер — Next.js дедуплицирует одинаковые `fetch()` в рамках одного рендера.
- Паттерн проекта: `exactOptionalPropertyTypes: true` → опциональные пропсы передавать через conditional spread `{...(x ? { field: x } : {})}`.

**Все команды выполняются из `frontend/`, если не указано иное.**

---

### Task 1: SITE_URL, metadataBase и font display swap

**Files:**

- Create: `frontend/src/lib/site.ts`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/.env.example`

- [ ] **Step 1: Создать `frontend/src/lib/site.ts`**

```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gramjob.com'
```

- [ ] **Step 2: Добавить переменную в `frontend/.env.example`**

После строки `NEXT_PUBLIC_API_URL=http://localhost:1337/api` добавить:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: Обновить `frontend/src/app/layout.tsx`**

Добавить `display: 'swap'` в конфиг Inter, `metadataBase` и OG-дефолты в metadata:

```tsx
import { SITE_URL } from '@/lib/site'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'GramJob — работа и вакансии в Telegram',
  description:
    'Международная биржа вакансий и резюме в экосистеме Telegram. Find opportunities. Build futures.',
  icons: { icon: '/logo-vertical.png' },
  openGraph: {
    siteName: 'GramJob',
    type: 'website',
    locale: 'ru_RU',
  },
}
```

Остальное в layout.tsx не трогать.

- [ ] **Step 4: Проверить typecheck**

Run: `pnpm typecheck`
Expected: 0 ошибок

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/site.ts frontend/src/app/layout.tsx frontend/.env.example
git commit -m "feat(seo): add SITE_URL, metadataBase, OG defaults, font display swap"
```

---

### Task 2: Серверные фетч-хелперы `lib/server-api.ts`

**Files:**

- Create: `frontend/src/lib/server-api.ts`
- Test: `frontend/src/lib/server-api.test.ts`

- [ ] **Step 1: Написать failing-тесты `frontend/src/lib/server-api.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchVacancyServer,
  fetchCompanyServer,
  fetchVacanciesPageServer,
  fetchCompaniesPageServer,
} from './server-api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function okResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) }
}

describe('server-api', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('fetchVacancyServer returns vacancy data with skipViewCount', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: { documentId: 'v1', title: 'Dev' } }))
    const result = await fetchVacancyServer('v1')
    expect(result).toEqual({ documentId: 'v1', title: 'Dev' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/vacancies/v1?skipViewCount=true'),
      { next: { revalidate: 300 } }
    )
  })

  it('fetchVacancyServer returns null on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    expect(await fetchVacancyServer('missing')).toBeNull()
  })

  it('fetchVacancyServer returns null when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    expect(await fetchVacancyServer('v1')).toBeNull()
  })

  it('fetchCompanyServer returns company data', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: { documentId: 'c1', name: 'Acme' } }))
    const result = await fetchCompanyServer('c1')
    expect(result).toEqual({ documentId: 'c1', name: 'Acme' })
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/companies/c1'), {
      next: { revalidate: 300 },
    })
  })

  it('fetchVacanciesPageServer returns items and total', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: [{ documentId: 'v1' }], meta: { total: 42 } }))
    const result = await fetchVacanciesPageServer(1, 20)
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(42)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/vacancies?page=1&pageSize=20'),
      { next: { revalidate: 3600 } }
    )
  })

  it('fetchVacanciesPageServer returns empty page on error', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    expect(await fetchVacanciesPageServer(1, 20)).toEqual({ items: [], total: 0 })
  })

  it('fetchCompaniesPageServer returns items and total', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: [{ documentId: 'c1' }], meta: { total: 7 } }))
    const result = await fetchCompaniesPageServer(2, 100)
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(7)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/companies?page=2&pageSize=100'),
      { next: { revalidate: 3600 } }
    )
  })
})
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `pnpm test -- src/lib/server-api.test.ts`
Expected: FAIL — модуль `./server-api` не существует

- [ ] **Step 3: Реализовать `frontend/src/lib/server-api.ts`**

```ts
import type { Company, Vacancy } from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'

async function fetchJson<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export interface ListPage<T> {
  items: T[]
  total: number
}

type ListResponse<T> = { data?: T[]; meta?: { total?: number } }

export async function fetchVacancyServer(id: string): Promise<Vacancy | null> {
  const res = await fetchJson<{ data?: Vacancy }>(`/vacancies/${id}?skipViewCount=true`, 300)
  return res?.data ?? null
}

export async function fetchCompanyServer(id: string): Promise<Company | null> {
  const res = await fetchJson<{ data?: Company }>(`/companies/${id}`, 300)
  return res?.data ?? null
}

export async function fetchVacanciesPageServer(
  page: number,
  pageSize: number
): Promise<ListPage<Vacancy>> {
  const res = await fetchJson<ListResponse<Vacancy>>(
    `/vacancies?page=${page}&pageSize=${pageSize}`,
    3600
  )
  return { items: res?.data ?? [], total: res?.meta?.total ?? 0 }
}

export async function fetchCompaniesPageServer(
  page: number,
  pageSize: number
): Promise<ListPage<Company>> {
  const res = await fetchJson<ListResponse<Company>>(
    `/companies?page=${page}&pageSize=${pageSize}`,
    3600
  )
  return { items: res?.data ?? [], total: res?.meta?.total ?? 0 }
}
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `pnpm test -- src/lib/server-api.test.ts`
Expected: PASS (7 тестов)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/server-api.ts frontend/src/lib/server-api.test.ts
git commit -m "feat(seo): add server-side fetch helpers with ISR caching"
```

---

### Task 3: SSR детальной страницы вакансии + OG-метаданные

**Files:**

- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`
- Modify: `frontend/src/app/vacancies/[id]/page.tsx`
- Test: `frontend/src/app/vacancies/[id]/VacancyDetailClient.test.tsx`

- [ ] **Step 1: Написать failing-тест в `VacancyDetailClient.test.tsx`**

Добавить тест (mock-хелперы и mock-объект вакансии уже есть в файле — использовать их; ниже `makeVacancy`/`makeStores` заменить на реальные имена хелперов из файла):

```tsx
it('renders SSR initial vacancy while store has no data', () => {
  // стор в состоянии первого клиентского фетча: isLoading=true, currentVacancy=null
  setupStores({ vacancy: { currentVacancy: null, isLoading: true } })
  render(<VacancyDetailClient id="vac123" initialVacancy={mockVacancy} />)
  expect(screen.getByText(mockVacancy.title)).toBeInTheDocument()
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm test -- "src/app/vacancies/[id]/VacancyDetailClient.test.tsx"`
Expected: FAIL — рендерится скелетон вместо контента (проп `initialVacancy` не существует)

- [ ] **Step 3: Обновить `VacancyDetailClient.tsx`**

Изменить Props и guard-логику. Было:

```tsx
interface Props {
  id: string
}
```

Стало:

```tsx
import type { Vacancy } from '@/types/api'

interface Props {
  id: string
  initialVacancy?: Vacancy
}
```

Сигнатура компонента: `function VacancyDetailClient({ id, initialVacancy }: Props)`.

Было (guards):

```tsx
if (store.isLoading) {
  return <CardListSkeleton count={3} />
}

if (!store.currentVacancy) {
  return (
    <ErrorState
      message={t('vacancyDetail.notFound')}
      onRetry={() => void store.fetchVacancyById(id)}
    />
  )
}

const v = store.currentVacancy
```

Стало:

```tsx
const v = store.currentVacancy ?? initialVacancy ?? null

if (store.isLoading && !v) {
  return <CardListSkeleton count={3} />
}

if (!v) {
  return (
    <ErrorState
      message={t('vacancyDetail.notFound')}
      onRetry={() => void store.fetchVacancyById(id)}
    />
  )
}
```

`useEffect` с `fetchVacancyById` НЕ трогать — клиентский фетч по-прежнему считает просмотры и подтягивает свежие данные.

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `pnpm test -- "src/app/vacancies/[id]/VacancyDetailClient.test.tsx"`
Expected: PASS (старые + новый)

- [ ] **Step 5: Переписать `frontend/src/app/vacancies/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { fetchVacancyServer } from '@/lib/server-api'
import { getMediaUrl } from '@/lib/media'
import { VacancyDetailClient } from './VacancyDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const vacancy = await fetchVacancyServer(id)
  if (!vacancy) return { title: 'Вакансия | GramJob' }

  const description =
    (vacancy.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `Вакансия ${vacancy.title} на GramJob`
  const logoUrl = getMediaUrl(vacancy.company?.logo?.url)

  return {
    title: `${vacancy.title} | GramJob`,
    description,
    alternates: { canonical: `/vacancies/${id}` },
    openGraph: {
      title: vacancy.title,
      description,
      type: 'article',
      url: `/vacancies/${id}`,
      ...(logoUrl ? { images: [logoUrl] } : {}),
    },
  }
}

export default async function VacancyPage({ params }: Props) {
  const { id } = await params
  const vacancy = await fetchVacancyServer(id)
  return <VacancyDetailClient id={id} {...(vacancy ? { initialVacancy: vacancy } : {})} />
}
```

Важно: НЕ вызывать `notFound()` при `vacancy === null` — черновики видны только владельцу через клиентский фетч с JWT.

- [ ] **Step 6: Typecheck + все тесты**

Run: `pnpm typecheck && pnpm test`
Expected: 0 ошибок, все тесты PASS

- [ ] **Step 7: Ручная проверка SSR**

Запустить backend (`pnpm --filter backend dev` из корня, если ещё не запущен) и frontend (`pnpm dev`). Открыть опубликованную вакансию и проверить, что контент есть в HTML-ответе сервера:

Run: `curl -s http://localhost:3000/vacancies/<documentId опубликованной вакансии> | grep -o '<h1[^>]*>[^<]*</h1>'`
Expected: `<h1 ...>Название вакансии</h1>` — заголовок присутствует в первичном HTML

- [ ] **Step 8: Commit**

```bash
git add "frontend/src/app/vacancies/[id]/page.tsx" "frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx" "frontend/src/app/vacancies/[id]/VacancyDetailClient.test.tsx"
git commit -m "feat(seo): SSR vacancy detail page with OG metadata and canonical"
```

---

### Task 4: SSR детальной страницы компании + OG-метаданные

**Files:**

- Modify: `frontend/src/app/companies/[id]/CompanyDetailClient.tsx`
- Modify: `frontend/src/app/companies/[id]/page.tsx`
- Test: `frontend/src/app/companies/[id]/CompanyDetailClient.test.tsx`

- [ ] **Step 1: Написать failing-тест в `CompanyDetailClient.test.tsx`**

По аналогии с Task 3 (использовать существующие mock-хелперы файла):

```tsx
it('renders SSR initial company while store has no data', () => {
  setupStores({ company: { currentCompany: null, isLoading: true, error: null } })
  render(<CompanyDetailClient id="comp1" initialCompany={mockCompany} />)
  expect(screen.getByText(mockCompany.name)).toBeInTheDocument()
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm test -- "src/app/companies/[id]/CompanyDetailClient.test.tsx"`
Expected: FAIL

- [ ] **Step 3: Обновить `CompanyDetailClient.tsx`**

Props:

```tsx
import type { Company } from '@/types/api'

interface Props {
  id: string
  initialCompany?: Company
}
```

Сигнатура: `function CompanyDetailClient({ id, initialCompany }: Props)`.

Было (guards):

```tsx
if (store.isLoading) {
  return <CardListSkeleton count={3} />
}

if (store.error || !store.currentCompany) {
  return (
    <ErrorState
      message={store.error ?? t('companyDetail.notFound')}
      onRetry={() => void store.fetchCompanyById(id)}
    />
  )
}

const company = store.currentCompany
```

Стало:

```tsx
const company = store.currentCompany ?? initialCompany ?? null

if (store.isLoading && !company) {
  return <CardListSkeleton count={3} />
}

if (!company) {
  return (
    <ErrorState
      message={store.error ?? t('companyDetail.notFound')}
      onRetry={() => void store.fetchCompanyById(id)}
    />
  )
}
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `pnpm test -- "src/app/companies/[id]/CompanyDetailClient.test.tsx"`
Expected: PASS

- [ ] **Step 5: Переписать `frontend/src/app/companies/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { fetchCompanyServer } from '@/lib/server-api'
import { getMediaUrl } from '@/lib/media'
import { CompanyDetailClient } from './CompanyDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const company = await fetchCompanyServer(id)
  if (!company) return { title: 'Компания | GramJob' }

  const description =
    (company.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `Профиль компании ${company.name} на GramJob`
  const logoUrl = getMediaUrl(company.logo?.url)

  return {
    title: `${company.name} | GramJob`,
    description,
    alternates: { canonical: `/companies/${id}` },
    openGraph: {
      title: company.name,
      description,
      type: 'website',
      url: `/companies/${id}`,
      ...(logoUrl ? { images: [logoUrl] } : {}),
    },
  }
}

export default async function CompanyPage({ params }: Props) {
  const { id } = await params
  const company = await fetchCompanyServer(id)
  return <CompanyDetailClient id={id} {...(company ? { initialCompany: company } : {})} />
}
```

- [ ] **Step 6: Typecheck + тесты**

Run: `pnpm typecheck && pnpm test`
Expected: 0 ошибок, все тесты PASS

- [ ] **Step 7: Commit**

```bash
git add "frontend/src/app/companies/[id]/page.tsx" "frontend/src/app/companies/[id]/CompanyDetailClient.tsx" "frontend/src/app/companies/[id]/CompanyDetailClient.test.tsx"
git commit -m "feat(seo): SSR company detail page with OG metadata and canonical"
```

---

### Task 5: ISR списков вакансий и компаний

**Files:**

- Modify: `frontend/src/app/vacancies/page.tsx`
- Modify: `frontend/src/app/vacancies/VacanciesClient.tsx`
- Modify: `frontend/src/app/companies/page.tsx`
- Modify: `frontend/src/app/companies/CompaniesClient.tsx`
- Test: `frontend/src/app/vacancies/VacanciesClient.test.tsx`
- Test: `frontend/src/app/companies/CompaniesClient.test.tsx`

- [ ] **Step 1: Написать failing-тест в `VacanciesClient.test.tsx`**

Используя существующие `makeStore` и `mockVacancy` из файла:

```tsx
it('renders SSR initial vacancies while store is loading', () => {
  vi.mocked(useStores).mockReturnValue({
    vacancy: makeStore({ isLoading: true, vacancies: [], total: 0 }),
  } as unknown as ReturnType<typeof useStores>)
  render(<VacanciesClient initialVacancies={[mockVacancy]} initialTotal={1} />)
  expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument()
})
```

(Форму mock-возврата `useStores` скопировать из соседних тестов файла — там же мокается стор для `SaveSearchButton`, если требуется.)

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm test -- src/app/vacancies/VacanciesClient.test.tsx`
Expected: FAIL — виден скелетон, проп не существует

- [ ] **Step 3: Обновить `VacanciesClient.tsx`**

Добавить Props и fallback-логику:

```tsx
import type { Vacancy, VacancyListParams } from '@/types/api'

interface Props {
  initialVacancies?: Vacancy[]
  initialTotal?: number
}

export const VacanciesClient = observer(function VacanciesClient({
  initialVacancies,
  initialTotal,
}: Props) {
  const { vacancy: store } = useStores()
  const { t } = useTranslation()
  const [params, setParams] = useState<VacancyListParams>({ page: 1 })
  const [searchInput, setSearchInput] = useState('')
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    void store.fetchVacancies({ page: 1 }).finally(() => setLoadedOnce(true))
  }, [store])
```

После хендлеров (перед `return`) добавить вычисления:

```tsx
const useInitial =
  !loadedOnce && store.vacancies.length === 0 && (initialVacancies?.length ?? 0) > 0
const items = useInitial ? (initialVacancies ?? []) : store.vacancies
const total = useInitial ? (initialTotal ?? 0) : store.total
const page = useInitial ? 1 : store.page
const pageCount = useInitial ? Math.ceil((initialTotal ?? 0) / 20) : store.pageCount
const showSkeleton = store.isLoading && items.length === 0
```

В JSX заменить условия рендера:

- `{store.isLoading && <CardListSkeleton count={6} />}` → `{showSkeleton && <CardListSkeleton count={6} />}`
- `{!store.isLoading && !store.error && store.vacancies.length === 0 && (` → `{!store.isLoading && !store.error && items.length === 0 && (`
- `{!store.isLoading && store.vacancies.length > 0 && (` → `{!showSkeleton && items.length > 0 && (`
- Внутри блока списка: `store.total` → `total`, `store.vacancies.map` → `items.map`, `page={store.page}` → `page={page}`, `pageCount={store.pageCount}` → `pageCount={pageCount}`

- [ ] **Step 4: Запустить тесты — PASS**

Run: `pnpm test -- src/app/vacancies/VacanciesClient.test.tsx`
Expected: PASS (все старые тесты тоже — при `initialVacancies` undefined поведение идентично старому)

- [ ] **Step 5: Переписать `frontend/src/app/vacancies/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { fetchVacanciesPageServer } from '@/lib/server-api'
import { VacanciesClient } from './VacanciesClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Вакансии | GramJob',
  description: 'Поиск работы в международной бирже вакансий GramJob',
  alternates: { canonical: '/vacancies' },
}

export default async function VacanciesPage() {
  const { items, total } = await fetchVacanciesPageServer(1, 20)
  return <VacanciesClient initialVacancies={items} initialTotal={total} />
}
```

(pageSize 20 = дефолт `VacancyStore.pageSize` — первый клиентский фетч отдаст ту же страницу.)

- [ ] **Step 6: Аналогично для компаний — failing-тест в `CompaniesClient.test.tsx`**

```tsx
it('renders SSR initial companies while store is loading', () => {
  vi.mocked(useStores).mockReturnValue({
    company: makeStore({ isLoading: true, companies: [], total: 0 }),
  } as unknown as ReturnType<typeof useStores>)
  render(<CompaniesClient initialCompanies={[mockCompany]} initialTotal={1} />)
  expect(screen.getByText(mockCompany.name)).toBeInTheDocument()
})
```

Run: `pnpm test -- src/app/companies/CompaniesClient.test.tsx`
Expected: FAIL

- [ ] **Step 7: Обновить `CompaniesClient.tsx`** — та же схема, что в Step 3:

```tsx
import type { Company, CompanyListParams } from '@/types/api'

interface Props {
  initialCompanies?: Company[]
  initialTotal?: number
}

export const CompaniesClient = observer(function CompaniesClient({
  initialCompanies,
  initialTotal,
}: Props) {
  const { company: store } = useStores()
  const { t } = useTranslation()
  const [params, setParams] = useState<CompanyListParams>({ page: 1 })
  const [searchInput, setSearchInput] = useState('')
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    void store.fetchCompanies({ page: 1 }).finally(() => setLoadedOnce(true))
  }, [store])
```

Вычисления перед `return`:

```tsx
const useInitial =
  !loadedOnce && store.companies.length === 0 && (initialCompanies?.length ?? 0) > 0
const items = useInitial ? (initialCompanies ?? []) : store.companies
const total = useInitial ? (initialTotal ?? 0) : store.total
const page = useInitial ? 1 : store.page
const pageCount = useInitial ? Math.ceil((initialTotal ?? 0) / 20) : store.pageCount
const showSkeleton = store.isLoading && items.length === 0
```

Замены в JSX — те же четыре, что в Step 3 (`store.companies` → `items` и т.д.).

- [ ] **Step 8: Переписать `frontend/src/app/companies/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { fetchCompaniesPageServer } from '@/lib/server-api'
import { CompaniesClient } from './CompaniesClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Компании | GramJob',
  description: 'Каталог компаний на платформе GramJob',
  alternates: { canonical: '/companies' },
}

export default async function CompaniesPage() {
  const { items, total } = await fetchCompaniesPageServer(1, 20)
  return <CompaniesClient initialCompanies={items} initialTotal={total} />
}
```

- [ ] **Step 9: Typecheck + все тесты**

Run: `pnpm typecheck && pnpm test`
Expected: 0 ошибок, все тесты PASS

- [ ] **Step 10: Ручная проверка SSR списка**

Run: `curl -s http://localhost:3000/vacancies | grep -c 'Senior\|vacancies/'`
Expected: карточки вакансий присутствуют в первичном HTML (число > 0)

- [ ] **Step 11: Commit**

```bash
git add frontend/src/app/vacancies frontend/src/app/companies
git commit -m "feat(seo): ISR for vacancy and company list pages with SSR initial data"
```

---

### Task 6: noindex для резюме

**Files:**

- Modify: `frontend/src/app/resumes/page.tsx`
- Modify: `frontend/src/app/resumes/[id]/page.tsx`

- [ ] **Step 1: Обновить `frontend/src/app/resumes/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { ResumesClient } from './ResumesClient'

export const metadata: Metadata = {
  title: 'База резюме | GramJob',
  description: 'Найдите лучших специалистов в базе резюме GramJob',
  robots: { index: false, follow: false },
}

export default function ResumesPage() {
  return <ResumesClient />
}
```

- [ ] **Step 2: Обновить `frontend/src/app/resumes/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { ResumeDetailClient } from './ResumeDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Резюме | GramJob',
  robots: { index: false, follow: false },
}

export default async function ResumeDetailPage({ params }: Props) {
  const { id } = await params
  return <ResumeDetailClient id={id} />
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: 0 ошибок

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/resumes
git commit -m "feat(seo): noindex for resume pages (Max-gated content)"
```

---

### Task 7: Динамический sitemap.xml

**Files:**

- Create: `frontend/src/app/sitemap.ts`
- Test: `frontend/src/app/sitemap.test.ts`

- [ ] **Step 1: Написать failing-тест `frontend/src/app/sitemap.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/server-api', () => ({
  fetchVacanciesPageServer: vi.fn(),
  fetchCompaniesPageServer: vi.fn(),
}))

import sitemap from './sitemap'
import { fetchVacanciesPageServer, fetchCompaniesPageServer } from '@/lib/server-api'

describe('sitemap', () => {
  beforeEach(() => {
    vi.mocked(fetchVacanciesPageServer).mockResolvedValue({
      items: [{ documentId: 'vac1', createdAt: '2026-07-01T00:00:00Z' } as never],
      total: 1,
    })
    vi.mocked(fetchCompaniesPageServer).mockResolvedValue({
      items: [{ documentId: 'comp1', createdAt: '2026-06-01T00:00:00Z' } as never],
      total: 1,
    })
  })

  it('includes static routes, vacancies and companies', async () => {
    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://gramjob.com')
    expect(urls).toContain('https://gramjob.com/vacancies')
    expect(urls).toContain('https://gramjob.com/companies')
    expect(urls).toContain('https://gramjob.com/vacancies/vac1')
    expect(urls).toContain('https://gramjob.com/companies/comp1')
  })

  it('does not include resume routes', async () => {
    const entries = await sitemap()
    expect(entries.every((e) => !e.url.includes('/resumes'))).toBe(true)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm test -- src/app/sitemap.test.ts`
Expected: FAIL — `./sitemap` не существует

- [ ] **Step 3: Реализовать `frontend/src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { fetchVacanciesPageServer, fetchCompaniesPageServer, type ListPage } from '@/lib/server-api'

export const revalidate = 3600

const PAGE_SIZE = 100
const MAX_PAGES = 10

async function collectAll<T>(
  fetchPage: (page: number, pageSize: number) => Promise<ListPage<T>>
): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, total } = await fetchPage(page, PAGE_SIZE)
    out.push(...items)
    if (items.length === 0 || out.length >= total) break
  }
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vacancies, companies] = await Promise.all([
    collectAll(fetchVacanciesPageServer),
    collectAll(fetchCompaniesPageServer),
  ])

  return [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/vacancies`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/companies`, changeFrequency: 'daily', priority: 0.7 },
    ...vacancies.map((v) => ({
      url: `${SITE_URL}/vacancies/${v.documentId}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
      lastModified: v.createdAt,
    })),
    ...companies.map((c) => ({
      url: `${SITE_URL}/companies/${c.documentId}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
      lastModified: c.createdAt,
    })),
  ]
}
```

(Ограничение MAX_PAGES × PAGE_SIZE = 1000 URL на тип — достаточно для MVP; при росте перейти на sitemap index через `generateSitemaps`.)

- [ ] **Step 4: Запустить тесты — PASS**

Run: `pnpm test -- src/app/sitemap.test.ts`
Expected: PASS (2 теста)

- [ ] **Step 5: Ручная проверка**

Run: `curl -s http://localhost:3000/sitemap.xml | head -30`
Expected: валидный XML с `<urlset>`, статические маршруты + вакансии/компании

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/sitemap.ts frontend/src/app/sitemap.test.ts
git commit -m "feat(seo): dynamic sitemap.xml with published vacancies and companies"
```

---

### Task 8: robots.txt

**Files:**

- Create: `frontend/src/app/robots.ts`

- [ ] **Step 1: Создать `frontend/src/app/robots.ts`**

```ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/resumes', '/subscription', '/login', '/register'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 2: Ручная проверка**

Run: `curl -s http://localhost:3000/robots.txt`
Expected:

```
User-Agent: *
Allow: /
Disallow: /dashboard
Disallow: /resumes
Disallow: /subscription
Disallow: /login
Disallow: /register

Sitemap: https://gramjob.com/sitemap.xml
```

(локально Sitemap-URL будет с localhost, если `NEXT_PUBLIC_SITE_URL` задан в `.env.local`)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/robots.ts
git commit -m "feat(seo): robots.txt — close dashboard/resumes/auth, expose sitemap"
```

---

### Task 9: next/image для логотипа в VacancyDetailClient

**Files:**

- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx` (единственный оставшийся `<img>` в src, вне тестов)

- [ ] **Step 1: Заменить `<img>` на `next/image`**

Добавить импорт:

```tsx
import Image from 'next/image'
```

Было:

```tsx
<img src={logoUrl} alt={v.company.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
```

Стало:

```tsx
<Image
  src={logoUrl}
  alt={v.company.name}
  width={56}
  height={56}
  className="h-14 w-14 shrink-0 rounded-lg object-cover"
/>
```

- [ ] **Step 2: Typecheck + тесты + визуальная проверка**

Run: `pnpm typecheck && pnpm test -- "src/app/vacancies/[id]/VacancyDetailClient.test.tsx"`
Expected: PASS. Открыть вакансию с логотипом компании в браузере — логотип отображается.

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx"
git commit -m "perf(frontend): use next/image for company logo on vacancy detail"
```

---

### Task 10: Bundle analyzer

**Files:**

- Modify: `frontend/next.config.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: Установить пакет**

Run (из корня репо): `pnpm --filter frontend add -D @next/bundle-analyzer`

- [ ] **Step 2: Обернуть конфиг в `frontend/next.config.ts`**

```ts
import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // ... существующий конфиг без изменений ...
}

export default withBundleAnalyzer(nextConfig)
```

- [ ] **Step 3: Добавить скрипт в `frontend/package.json`**

```json
"analyze": "ANALYZE=true next build"
```

- [ ] **Step 4: Запустить анализ**

Run: `pnpm analyze`
Expected: сборка успешна, открываются HTML-отчёты (client/server bundles).

Что проверить:

1. `recharts` присутствует ТОЛЬКО в чанках маршрутов `/dashboard/vacancies/[id]/analytics` и `/dashboard/resumes/[id]/analytics` (App Router сплитит по маршрутам). Если recharts попал в shared-чанк — вынести компоненты графиков в `next/dynamic` с `ssr: false`.
2. `@telegram-apps/telegram-ui` — оценить вес в First Load JS публичных страниц; если > ~50 kB и используется точечно — импортировать конкретные компоненты вместо корневого пакета.
3. Записать First Load JS главной, /vacancies и /vacancies/[id] — зафиксировать в сообщении коммита.

- [ ] **Step 5: Устранить найденные проблемы (если есть) и повторить `pnpm analyze`**

Критерий: First Load JS публичных страниц не содержит recharts; нет дублирующихся тяжёлых зависимостей в нескольких чанках.

- [ ] **Step 6: Typecheck + тесты + commit**

Run: `pnpm typecheck && pnpm test`

```bash
git add frontend/next.config.ts frontend/package.json ../pnpm-lock.yaml
git commit -m "perf(frontend): add bundle analyzer, trim heavy dependencies"
```

---

### Task 11: Lighthouse audit ≥ 90

**Files:**

- Возможные точечные правки по результатам аудита (см. чеклист ниже)

- [ ] **Step 1: Production-сборка и запуск**

Run: `pnpm build && pnpm start` (backend должен работать на :1337)
Expected: сервер на http://localhost:3000

- [ ] **Step 2: Прогнать Lighthouse по ключевым страницам**

```bash
npx lighthouse http://localhost:3000 --output=json --output-path=/tmp/lh-home.json --chrome-flags="--headless" --quiet
npx lighthouse http://localhost:3000/vacancies --output=json --output-path=/tmp/lh-vacancies.json --chrome-flags="--headless" --quiet
npx lighthouse "http://localhost:3000/vacancies/<documentId опубликованной вакансии>" --output=json --output-path=/tmp/lh-vacancy.json --chrome-flags="--headless" --quiet
npx lighthouse http://localhost:3000/companies --output=json --output-path=/tmp/lh-companies.json --chrome-flags="--headless" --quiet
```

Извлечь баллы:

```bash
for f in /tmp/lh-*.json; do echo "$f:"; node -e "const r=require('$f');for(const [k,v] of Object.entries(r.categories))console.log(' ',k,Math.round(v.score*100))"; done
```

Expected (цель): performance ≥ 90, accessibility ≥ 90, best-practices ≥ 90, seo ≥ 90 на всех четырёх страницах.

- [ ] **Step 3: Исправить найденные проблемы**

Типовые кандидаты (проверять по конкретному отчёту, чинить только реально зафиксированное):

- **SEO**: отсутствие meta description на какой-то странице → добавить в metadata; ссылки без описательного текста → добавить aria-label.
- **Performance**: изображения без явных размеров → указать width/height; неиспользуемый JS → см. Task 10; `telegram-web-app.js` с `beforeInteractive` блокирует старт — попробовать `strategy="afterInteractive"` и проверить, что Mini App-инициализация не сломалась (`useTelegramInit` читает `window.Telegram` в useEffect — afterInteractive выполняется раньше эффектов).
- **Accessibility**: контраст текста (`text-muted-foreground` на цветных бейджах), отсутствие alt, порядок заголовков h1→h2.
- **Best practices**: console.error в проде, отсутствие HTTPS локально можно игнорировать.

После каждого исправления — повторить замер по затронутой странице.

- [ ] **Step 4: Финальный прогон + тесты**

Run: `pnpm typecheck && pnpm test`, затем повторить Step 2.
Expected: все категории ≥ 90, все тесты PASS.

- [ ] **Step 5: Commit**

```bash
git add -A frontend/src
git commit -m "perf(frontend): lighthouse fixes — all public pages score 90+"
```

---

### Task 12: Обновить план спринта

**Files:**

- Modify: `docs/sprint-plan.md:328-337` (секция SEO & Performance)

- [ ] **Step 1: Отметить чекбоксы**

Проставить `[x]` для всех выполненных пунктов секции «SEO & Performance» (строки 330–337). В пункте «Preload критических шрифтов» дописать «(next/font Inter, display: swap — уже был подключён, добавлен swap)».

- [ ] **Step 2: Commit**

```bash
git add docs/sprint-plan.md
git commit -m "docs: mark Sprint 10 SEO & Performance tasks complete"
```

---

## Verification (после всех задач)

1. `pnpm typecheck && pnpm test` — 0 ошибок, все тесты зелёные (было 310).
2. `curl -s http://localhost:3000/vacancies/<id> | grep '<h1'` — контент в первичном HTML.
3. `curl -s http://localhost:3000/sitemap.xml` — вакансии и компании присутствуют, резюме — нет.
4. `curl -s http://localhost:3000/robots.txt` — dashboard/resumes закрыты.
5. Lighthouse ≥ 90 по всем категориям на 4 ключевых страницах.
6. Ручной smoke: вакансия открывается, отклик работает, владелец видит свой черновик, тёмная тема Mini App не сломана.
