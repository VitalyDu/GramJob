# UI/UX Redesign — Phase 3: Редизайн страниц и компонентов Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Все страницы, карточки, формы, фильтры, таблицы и модалки переведены на shadcn/ui с едиными Empty/Loading/Error-состояниями; фильтры вакансий на desktop видимы, на mobile — в Sheet; карточка вакансии показывает 👁 просмотры и 📨 отклики.

**Architecture:** Сначала строятся переиспользуемые примитивы (`PageHeader`, `EmptyState`, `ErrorState`, `CardListSkeleton`, `PaginationBar`) — затем они механически применяются на каждой странице. Фильтры выделяются в «content»-компонент, который рендерится в двух обёртках: инлайн-панель (desktop, `hidden md:block`) и Sheet (mobile). Страницы не задают внешний контейнер (правило Phase 1).

**Tech Stack:** Next.js 15 App Router, React 19, MobX, shadcn/ui (установлен в Phase 1), TailwindCSS 4, lucide-react, Vitest + Testing Library.

**Зависимости:** Phase 1 (тема, shadcn, контейнер) — обязательно. Phase 2 Task 5 (`views`/`applicationsCount` в API) — для Task 3 этого плана.

**Спека:** `docs/ui-ux-redesign.md` §1, §2, §3, §4, §7, §10, §12, §13.

**Конвенции проекта (обязательны):**

- Коммиты **без** `Co-Authored-By`.
- `exactOptionalPropertyTypes: true` — conditional spread для опциональных полей.
- Тесты: Vitest + Testing Library, описания на русском, колокально `*.test.tsx`.
- Тексты UI — хардкод на русском (как в существующих клиентах), навигация — через i18n-ключи.
- Команды: `pnpm -C frontend test`, `pnpm -C frontend typecheck`.

---

## Ключевые правила редизайна (применять на каждой странице)

1. **Контейнер:** страница не оборачивает контент в `max-w-*` — ширину даёт AppShell. Исключение: формы и auth — `mx-auto max-w-2xl`.
2. **Карточки** — `Card`/`CardHeader`/`CardContent` из shadcn вместо самописных `rounded-xl border`.
3. **Селекты** — `Select` из shadcn вместо нативных `<select>`.
4. **Модалки** — `Dialog` (desktop-центрированные) или `Sheet` (мобильные фильтры/панели) вместо самописных fixed-оверлеев.
5. **Бейджи** — `Badge` (variants: default/secondary/destructive/outline) вместо самописных `rounded-full px-2`.
6. **Таблицы** — `Table` для табличных данных.
7. **Пагинация** — `PaginationBar` (Task 1) везде вместо самописных кнопок «Назад/Вперёд».
8. **Loading** — `CardListSkeleton`/`Skeleton` вместо текста «Загрузка...».
9. **Empty** — `EmptyState` с иконкой, заголовком, описанием и CTA-кнопкой.
10. **Error** — `ErrorState` с кнопкой «Повторить».
11. Никаких `bg-white`, `text-gray-*`, `bg-gray-*` — только семантические токены (правило Sprint 9).

---

### Task 1: Переиспользуемые примитивы состояний и структуры

**Files:**

- Create: `frontend/src/components/shared/PageHeader.tsx`
- Create: `frontend/src/components/shared/EmptyState.tsx`
- Create: `frontend/src/components/shared/ErrorState.tsx`
- Create: `frontend/src/components/shared/CardListSkeleton.tsx`
- Create: `frontend/src/components/shared/PaginationBar.tsx`
- Test: `frontend/src/components/shared/shared.test.tsx`

- [ ] **Step 1: Написать падающие тесты**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Briefcase } from 'lucide-react'
import { PageHeader } from './PageHeader'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { CardListSkeleton } from './CardListSkeleton'
import { PaginationBar } from './PaginationBar'

describe('PageHeader', () => {
  it('рендерит заголовок h1, описание и actions', () => {
    render(
      <PageHeader
        title="Вакансии"
        description="Найдите работу"
        actions={<button>Создать</button>}
      />
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Вакансии' })).toBeInTheDocument()
    expect(screen.getByText('Найдите работу')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('рендерит заголовок, описание и action', () => {
    render(
      <EmptyState
        icon={Briefcase}
        title="Пока пусто"
        description="Здесь появятся вакансии"
        action={<button>Создать вакансию</button>}
      />
    )
    expect(screen.getByText('Пока пусто')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать вакансию' })).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('вызывает onRetry по кнопке «Повторить»', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Не удалось загрузить" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /повторить/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('CardListSkeleton', () => {
  it('рендерит указанное число скелетонов', () => {
    render(<CardListSkeleton count={4} />)
    expect(screen.getAllByTestId('card-skeleton')).toHaveLength(4)
  })
})

describe('PaginationBar', () => {
  it('вызывает onPageChange при клике на страницу', async () => {
    const onPageChange = vi.fn()
    render(<PaginationBar page={1} pageCount={3} onPageChange={onPageChange} />)
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('не рендерится при pageCount <= 1', () => {
    const { container } = render(<PaginationBar page={1} pageCount={1} onPageChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `pnpm -C frontend test -- shared`
Expected: FAIL — модули не существуют.

- [ ] **Step 3: Реализовать компоненты**

`PageHeader.tsx`:

```tsx
import { type ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
```

`EmptyState.tsx`:

```tsx
import { type ComponentType, type ReactNode } from 'react'

interface Props {
  icon: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
        <Icon className="h-6 w-6 text-accent-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

`ErrorState.tsx`:

```tsx
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Что-то пошло не так', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  )
}
```

`CardListSkeleton.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export function CardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          data-testid="card-skeleton"
          className="flex items-start gap-4 rounded-xl border p-4"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

`PaginationBar.tsx` (окно из 5 страниц вокруг текущей, кнопки — не ссылки, т.к. пагинация client-side через MobX):

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

export function PaginationBar({ page, pageCount, onPageChange }: Props) {
  if (pageCount <= 1) return null

  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i)

  return (
    <nav aria-label="Пагинация" className="mt-6 flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Предыдущая страница"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'ghost'}
          size="icon"
          className={cn('h-9 w-9', p === page && 'pointer-events-none')}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPageChange(p)}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Следующая страница"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}
```

- [ ] **Step 4: Запустить тесты**

Run: `pnpm -C frontend test -- shared && pnpm -C frontend typecheck`
Expected: PASS, 0 ошибок TS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared
git commit -m "feat(frontend): shared page primitives (PageHeader, EmptyState, ErrorState, skeletons, pagination)"
```

---

### Task 2: Редизайн VacancyCard + счётчики 👁/📨

Требует Phase 2 Task 5 (API отдаёт `views`/`applicationsCount`).

**Files:**

- Modify: `frontend/src/components/vacancy/VacancyCard.tsx`
- Test: `frontend/src/components/vacancy/VacancyCard.test.tsx`

- [ ] **Step 1: Написать падающий тест**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Vacancy } from '@/types/api'
import { VacancyCard } from './VacancyCard'

const vacancy = {
  documentId: 'v1',
  title: 'Frontend Developer',
  country: 'RU',
  city: 'Москва',
  workFormat: 'remote',
  employmentType: 'full_time',
  seniority: 'senior',
  salaryFrom: 3000,
  salaryTo: 5000,
  salaryCurrency: 'usd',
  urgent: false,
  topPlacement: false,
  highlighted: false,
  sourceType: 'internal',
  status: 'published',
  views: 128,
  applicationsCount: 7,
  company: { documentId: 'c1', name: 'Acme', slug: 'acme' },
} as unknown as Vacancy

describe('VacancyCard', () => {
  it('показывает количество просмотров и откликов', () => {
    render(<VacancyCard vacancy={vacancy} />)
    expect(screen.getByLabelText('Просмотры: 128')).toBeInTheDocument()
    expect(screen.getByLabelText('Отклики: 7')).toBeInTheDocument()
  })

  it('не показывает счётчики, если поля отсутствуют', () => {
    const { views: _v, applicationsCount: _a, ...rest } = vacancy as Record<string, unknown>
    render(<VacancyCard vacancy={rest as unknown as Vacancy} />)
    expect(screen.queryByLabelText(/Просмотры/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm -C frontend test -- VacancyCard`
Expected: FAIL — счётчиков нет.

- [ ] **Step 3: Переписать VacancyCard**

```tsx
import Image from 'next/image'
import Link from 'next/link'
import { Eye, Send } from 'lucide-react'
import type { Vacancy } from '@/types/api'
import { getMediaUrl } from '@/lib/media'
import {
  WORK_FORMAT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  formatSalary,
} from '@/lib/vacancy-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { VacancyStatusBadge } from './VacancyStatusBadge'

interface Props {
  vacancy: Vacancy
}

export function VacancyCard({ vacancy }: Props) {
  const logoUrl = getMediaUrl(vacancy.company.logo?.url)
  const salary = formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.salaryCurrency)

  return (
    <Link href={`/vacancies/${vacancy.documentId}`} className="group block">
      <Card
        className={cn(
          'transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md',
          vacancy.highlighted && 'border-brand-orange/40 bg-brand-orange/5'
        )}
      >
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={vacancy.company.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {vacancy.company.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-semibold group-hover:text-primary">{vacancy.title}</p>
              <VacancyStatusBadge status={vacancy.status} />
            </div>

            <p className="mt-0.5 text-sm text-muted-foreground">{vacancy.company.name}</p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">
                {vacancy.city ? `${vacancy.country}, ${vacancy.city}` : vacancy.country}
              </Badge>
              <Badge variant="secondary">{WORK_FORMAT_LABELS[vacancy.workFormat]}</Badge>
              <Badge variant="secondary">{EMPLOYMENT_TYPE_LABELS[vacancy.employmentType]}</Badge>
              <Badge variant="secondary">{SENIORITY_LABELS[vacancy.seniority]}</Badge>
              {vacancy.urgent && <Badge variant="destructive">🔥 Urgent</Badge>}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {salary ? (
                <p className="text-sm font-semibold text-foreground">{salary}</p>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {typeof vacancy.views === 'number' && (
                  <span
                    aria-label={`Просмотры: ${vacancy.views}`}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {vacancy.views}
                  </span>
                )}
                {typeof vacancy.applicationsCount === 'number' && (
                  <span
                    aria-label={`Отклики: ${vacancy.applicationsCount}`}
                    className="flex items-center gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {vacancy.applicationsCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 4: Запустить тесты**

Run: `pnpm -C frontend test && pnpm -C frontend typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/vacancy/VacancyCard.tsx frontend/src/components/vacancy/VacancyCard.test.tsx
git commit -m "feat(frontend): redesign vacancy card with badges and views/applications counters"
```

---

### Task 3: Фильтры вакансий — desktop-панель + mobile Sheet

Архитектура: `VacancyFiltersContent` (чистая форма полей на shadcn Select) используется в двух обёртках внутри `VacancyFilters`: инлайн-`Card` (desktop, `hidden md:block`) и `Sheet` (mobile). На mobile на странице остаются только поиск + кнопка «Фильтры» с бейджем числа активных фильтров (спека §7).

**Files:**

- Rewrite: `frontend/src/components/vacancy/VacancyFilters.tsx`
- Test: `frontend/src/components/vacancy/VacancyFilters.test.tsx`

- [ ] **Step 1: Написать падающий тест**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VacancyFilters } from './VacancyFilters'

describe('VacancyFilters', () => {
  it('рендерит строку поиска и кнопку «Фильтры» (mobile-триггер)', () => {
    render(<VacancyFilters params={{}} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/поиск/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /фильтры/i })).toBeInTheDocument()
  })

  it('отправляет поиск через onChange с page: 1', async () => {
    const onChange = vi.fn()
    render(<VacancyFilters params={{}} onChange={onChange} />)
    await userEvent.type(screen.getByPlaceholderText(/поиск/i), 'react')
    await userEvent.click(screen.getAllByRole('button', { name: /найти/i })[0]!)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'react', page: 1 }))
  })

  it('показывает число активных фильтров на кнопке', () => {
    render(
      <VacancyFilters params={{ workFormat: 'remote', seniority: 'senior' }} onChange={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /фильтры/i })).toHaveTextContent('2')
  })

  it('кнопка «Сбросить» очищает фильтры', async () => {
    const onChange = vi.fn()
    render(<VacancyFilters params={{ workFormat: 'remote' }} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button', { name: /сбросить/i })[0]!)
    expect(onChange).toHaveBeenCalledWith({ page: 1 })
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm -C frontend test -- VacancyFilters`
Expected: FAIL.

- [ ] **Step 3: Переписать VacancyFilters**

```tsx
'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type {
  VacancyListParams,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
} from '@/types/api'
import { WORK_FORMAT_LABELS, EMPLOYMENT_TYPE_LABELS, SENIORITY_LABELS } from '@/lib/vacancy-utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface Props {
  params: VacancyListParams
  onChange: (params: VacancyListParams) => void
}

const ALL = '__all__'

const SORT_OPTIONS = [
  { value: ALL, label: 'По умолчанию' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'salary_desc', label: 'Зарплата ↓' },
  { value: 'salary_asc', label: 'Зарплата ↑' },
  { value: 'relevance', label: 'По релевантности' },
] as const

type Draft = {
  country: string
  workFormat: WorkFormatEnum | ''
  employmentType: EmploymentTypeEnum | ''
  seniority: SeniorityEnum | ''
  sort: string
}

function draftFromParams(params: VacancyListParams): Draft {
  return {
    country: params.country ?? '',
    workFormat: params.workFormat ?? '',
    employmentType: params.employmentType ?? '',
    seniority: params.seniority ?? '',
    sort: params.sort ?? '',
  }
}

function countActive(draft: Draft): number {
  return [draft.country, draft.workFormat, draft.employmentType, draft.seniority].filter(Boolean)
    .length
}

function FilterFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const enumSelect = <T extends string>(
    label: string,
    value: T | '',
    labels: Record<T, string>,
    allLabel: string,
    set: (v: T | '') => void
  ) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || ALL} onValueChange={(v) => set(v === ALL ? '' : (v as T))}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {(Object.entries(labels) as [T, string][]).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="filter-country">Страна</Label>
        <Input
          id="filter-country"
          value={draft.country}
          onChange={(e) => setDraft({ ...draft, country: e.target.value })}
          placeholder="RU, US..."
        />
      </div>
      {enumSelect('Формат работы', draft.workFormat, WORK_FORMAT_LABELS, 'Все форматы', (v) =>
        setDraft({ ...draft, workFormat: v })
      )}
      {enumSelect('Занятость', draft.employmentType, EMPLOYMENT_TYPE_LABELS, 'Все типы', (v) =>
        setDraft({ ...draft, employmentType: v })
      )}
      {enumSelect('Уровень', draft.seniority, SENIORITY_LABELS, 'Все уровни', (v) =>
        setDraft({ ...draft, seniority: v })
      )}
      <div className="space-y-1.5">
        <Label>Сортировка</Label>
        <Select
          value={draft.sort || ALL}
          onValueChange={(v) => setDraft({ ...draft, sort: v === ALL ? '' : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function VacancyFilters({ params, onChange }: Props) {
  const [search, setSearch] = useState(params.search ?? '')
  const [draft, setDraft] = useState<Draft>(draftFromParams(params))
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeCount = countActive(draftFromParams(params))

  const apply = () => {
    const next: VacancyListParams = { page: 1 }
    if (search) next.search = search
    if (draft.country) next.country = draft.country
    if (draft.workFormat) next.workFormat = draft.workFormat
    if (draft.employmentType) next.employmentType = draft.employmentType
    if (draft.seniority) next.seniority = draft.seniority
    if (draft.sort) next.sort = draft.sort as NonNullable<VacancyListParams['sort']>
    onChange(next)
    setSheetOpen(false)
  }

  const reset = () => {
    setSearch('')
    setDraft(draftFromParams({}))
    onChange({ page: 1 })
    setSheetOpen(false)
  }

  return (
    <div className="space-y-3">
      {/* Строка поиска + mobile-кнопка «Фильтры» */}
      <form
        role="search"
        aria-label="Поиск вакансий"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск вакансий..."
          className="flex-1"
        />
        <Button type="submit">Найти</Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="md:hidden">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Фильтры
              {activeCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1">{activeCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Фильтры</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-2">
              <FilterFields draft={draft} setDraft={setDraft} />
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Сбросить
              </Button>
              <Button className="flex-1" onClick={apply}>
                Найти
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </form>

      {/* Desktop-панель — всегда видима */}
      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterFields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={apply}>
              Найти
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

⚠️ Radix Select в jsdom требует мока `ResizeObserver`/`hasPointerCapture` — если тесты Select-взаимодействий падают, тестировать только видимое (кнопки/поиск/бейдж), как в Step 1.

- [ ] **Step 4: Запустить тесты**

Run: `pnpm -C frontend test && pnpm -C frontend typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/vacancy/VacancyFilters.tsx frontend/src/components/vacancy/VacancyFilters.test.tsx
git commit -m "feat(frontend): vacancy filters — desktop panel + mobile bottom sheet"
```

---

### Task 4: Страница /vacancies — layout с sidebar-фильтрами

**Files:**

- Modify: `frontend/src/app/vacancies/VacanciesClient.tsx`

- [ ] **Step 1: Перестроить layout**

Структура (сохраняя существующую MobX-логику `fetchVacancies`/params/`SaveSearchButton`):

```tsx
<div>
  <PageHeader title="Вакансии" description="Найдите работу мечты в Telegram-экосистеме" />
  <div className="md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
    <aside className="md:sticky md:top-20">
      <VacancyFilters params={params} onChange={handleParamsChange} />
      <div className="mt-3 hidden md:block"><SaveSearchButton ... /></div>
    </aside>
    <section className="mt-4 md:mt-0">
      {store.loading ? (
        <CardListSkeleton count={6} />
      ) : store.error ? (
        <ErrorState message="Не удалось загрузить вакансии" onRetry={refetch} />
      ) : vacancies.length === 0 ? (
        <EmptyState icon={Briefcase} title="Вакансии не найдены"
          description="Попробуйте изменить фильтры или поисковый запрос"
          action={<Button variant="outline" onClick={resetFilters}>Сбросить фильтры</Button>} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">Найдено: {store.total}</p>
          <div className="space-y-3">{vacancies.map(...)}</div>
          <PaginationBar page={page} pageCount={store.pageCount} onPageChange={setPage} />
        </>
      )}
    </section>
  </div>
</div>
```

Точные имена полей стора (`loading`, `error`, `total`, `pageCount`) взять из `frontend/src/stores/VacancyStore.ts` — перед правкой открыть и сверить. `refetch`/`resetFilters` — существующие обработчики страницы (или создать из текущей логики `handleParamsChange`).

- [ ] **Step 2: Проверить**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Смоук в браузере: desktop — фильтры слева и видимы; mobile (<768px) — только поиск + кнопка «Фильтры», Sheet снизу; нет горизонтального скролла.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/vacancies/VacanciesClient.tsx
git commit -m "feat(frontend): redesign vacancies page with sidebar filters layout"
```

---

### Task 5: Детальная страница вакансии

**Files:**

- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`

- [ ] **Step 1: Редизайн по правилам**

- Обернуть блоки в `Card`: шапка (лого + título + компания + бейджи + зарплата + счётчики 👁/📨 из `views`/`applicationsCount`), «Описание», «Обязанности», «Требования», «Условия», «Навыки» (Badge-лента), «Языки».
- Кнопка «Откликнуться» — большая `size="lg"` в шапке; на mobile — фиксированная снизу (`fixed bottom-16 inset-x-4 md:static`, поверх BottomNav отступ) ЛИБО просто первой в шапке — выбрать по месту, не ломая Mini App MainButton (в Mini App кнопка скрывается — существующая логика ApplyDialog/MainButton не трогается).
- `FavoriteButton`, «Пожаловаться» (`ReportDialog`), `BlockButton` — компактно в шапке через иконки с `Tooltip`.
- Loading: `Skeleton`-блоки; Error: `ErrorState`; External-вакансия: `Alert` с кнопкой «Apply on Source».

- [ ] **Step 2: Проверить + Commit**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test` → смоук в браузере (внутренняя и external вакансия).

```bash
git add frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx
git commit -m "feat(frontend): redesign vacancy detail page"
```

---

### Task 6: Резюме и компании — карточки, списки, детальные страницы

Применить те же правила (карточки → Card+Badge, фильтры → паттерн Task 3, состояния → Task 1). Фильтры резюме/компаний проще вакансийных — переиспользовать структуру: поиск + кнопка «Фильтры» (mobile Sheet) + desktop-панель.

**Files:**

- Modify: `frontend/src/components/resume/ResumeCard.tsx` — Card, Badge для skills (макс 5 + «+N»), аватар через `Avatar`
- Modify: `frontend/src/components/company/CompanyCard.tsx` — Card, Badge размера/страны
- Modify: `frontend/src/components/company/StatusBadge.tsx`, `frontend/src/components/resume/ResumeStatusBadge.tsx`, `frontend/src/components/vacancy/VacancyStatusBadge.tsx`, `frontend/src/components/application/ApplicationStatusBadge.tsx` — на базе shadcn `Badge` с вариантами: published/`default` (зелёный через className `bg-success text-white`), moderation/`secondary`, rejected/`destructive`, draft/expired/archived/`outline`
- Modify: `frontend/src/app/resumes/ResumesClient.tsx` — layout как Task 4 (sidebar), Max-gate экран оформить как `EmptyState` c иконкой Lock и CTA «Подписка Max» → `/subscription`
- Modify: `frontend/src/app/resumes/[id]/ResumeDetailClient.tsx` — Card-секции: шапка (Avatar + имя + желаемая зарплата), опыт работы (timeline: `border-l-2 border-border pl-4` списком), образование, навыки (Badge), контакты (Card с `Alert`, если замаскированы)
- Modify: `frontend/src/app/companies/CompaniesClient.tsx` — layout как Task 4
- Modify: `frontend/src/app/companies/[id]/CompanyDetailClient.tsx` — cover-изображение сверху (если есть), Card с описанием, ссылки website/telegram/linkedin как Button variant="outline" с иконками

- [ ] **Step 1: ResumeCard + CompanyCard + все StatusBadge** → `pnpm -C frontend test` (существующие тесты бейджей обновить под новую разметку, сохранив проверки текста статусов)
- [ ] **Step 2: Commit** — `git commit -m "feat(frontend): redesign resume/company cards and status badges"`
- [ ] **Step 3: ResumesClient + ResumeDetailClient** → typecheck + смоук
- [ ] **Step 4: Commit** — `git commit -m "feat(frontend): redesign resumes list and detail pages"`
- [ ] **Step 5: CompaniesClient + CompanyDetailClient** → typecheck + смоук
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): redesign companies list and detail pages"`

---

### Task 7: Формы — VacancyForm, ResumeForm, CompanyForm, ApplyDialog

Единый паттерн формы: секции в `Card` (`CardHeader` с заголовком секции + `CardContent` с полями), поля через shadcn `Input`/`Textarea`/`Select`, ошибки — `<p className="text-sm text-destructive">`. RHF+Zod-логика НЕ меняется (только разметка). Submit-кнопки: full-width на mobile. Mini App MainButton-логика (Sprint 9) сохраняется без изменений.

**Files:**

- Modify: `frontend/src/components/vacancy/VacancyForm.tsx` — секции: «Основное» (title, industry, specialization, company), «Условия» (employmentType, workFormat, seniority, country, city, salary), «Описание» (description, responsibilities, requirements, conditions — `Textarea`), «Дополнительно» (skills, languages, experienceYears, urgent — `Checkbox`)
- Modify: `frontend/src/components/resume/ResumeForm.tsx` — секции: «Личные данные», «Пожелания», «О себе», «Опыт работы» (useFieldArray-блоки в `Card` с кнопкой удаления `variant="ghost" size="icon"` + Trash2), «Образование», «Контакты»
- Modify: `frontend/src/components/company/CompanyForm.tsx` — секции: «Основное», «Контакты», «Локация»
- Modify: `frontend/src/components/application/ApplyDialog.tsx` — на shadcn `Dialog` (`DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`), выбор резюме через `Select`, cover letter — `Textarea`

- [ ] **Step 1: VacancyForm** → typecheck + существующие тесты → commit `refactor(frontend): vacancy form on shadcn primitives with card sections`
- [ ] **Step 2: ResumeForm** → commit `refactor(frontend): resume form on shadcn primitives`
- [ ] **Step 3: CompanyForm** → commit `refactor(frontend): company form on shadcn primitives`
- [ ] **Step 4: ApplyDialog** → прогнать его тесты (если есть) → commit `refactor(frontend): apply dialog on shadcn Dialog`
- [ ] **Step 5: Смоук всех форм в браузере** — создать вакансию/резюме/компанию, откликнуться; на mobile поля не вылезают за экран.

---

### Task 8: Auth-страницы

**Files:**

- Modify: `frontend/src/app/(auth)/login/page.tsx`, `frontend/src/app/(auth)/register/page.tsx`
- Modify: `frontend/src/components/auth/EmailLoginForm.tsx`, `frontend/src/components/auth/EmailRegisterForm.tsx`

- [ ] **Step 1: Редизайн**

- Центрированная `Card` `mx-auto max-w-md` с `logo-vertical.png` сверху (`Image`, `width={120}`), заголовком и подзаголовком.
- Разделитель «или» (`Separator` + текст) между Telegram Login Widget и email-формой.
- Ссылки login↔register снизу.
- Формы — поля с `Label`, ошибки `text-destructive`.

- [ ] **Step 2: Проверить + Commit**

```bash
git add frontend/src/app/\(auth\) frontend/src/components/auth
git commit -m "feat(frontend): redesign auth pages with brand logo and card layout"
```

---

### Task 9: Dashboard-страницы (списки владельца)

Общий паттерн для всех: `PageHeader` (title + CTA «Создать»), `CardListSkeleton`, `EmptyState` с CTA, `PaginationBar`, действия строк — `DropdownMenu` (⋮) вместо ряда кнопок на mobile / кнопки на desktop. `RejectionNotice` и `LimitBar`/`UpsellModal` сохраняются как есть (функциональность не трогать).

**Files (по одной подзадаче на файл):**

- Modify: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx` — EmptyState «У вас нет вакансий» + CTA «Создать вакансию»; LimitBar в `Card` сверху
- Modify: `frontend/src/app/dashboard/resumes/MyResumesClient.tsx` — аналогично
- Modify: `frontend/src/app/dashboard/companies/MyCompaniesClient.tsx` — аналогично
- Modify: `frontend/src/app/dashboard/applications/MyApplicationsClient.tsx` + `frontend/src/components/application/ApplicationCard.tsx` — Card-разметка; в employer-режиме смена статуса через `Select`
- Modify: `frontend/src/app/dashboard/vacancies/[id]/applications/VacancyApplicationsClient.tsx`
- Modify: `frontend/src/app/dashboard/favorites/MyFavoritesClient.tsx` — вкладки на shadcn `Tabs` (Все/Вакансии/Резюме/Компании)
- Modify: `frontend/src/app/dashboard/saved-searches/MySavedSearchesClient.tsx` — `Table` (Имя, Тип-Badge, Дата, Действия) на desktop; Card-список на mobile (`hidden md:block` / `md:hidden`)
- Modify: `frontend/src/app/dashboard/blocks/MyBlocksClient.tsx` — `Table` аналогично
- Modify: `frontend/src/app/dashboard/notifications/NotificationsClient.tsx` — фильтры на `Tabs`, элементы в Card-списке, непрочитанные с `bg-accent/40`
- Modify: `frontend/src/app/dashboard/publications/PublicationsClient.tsx` — секции в Card, счётчики-Badge
- Modify: `frontend/src/app/dashboard/vacancies/[id]/analytics/VacancyAnalyticsClient.tsx` + `frontend/src/app/dashboard/resumes/[id]/analytics/ResumeAnalyticsClient.tsx` — стат-карточки на `Card`, скелетоны, PageHeader
- Modify: `frontend/src/app/subscription/SubscriptionClient.tsx` + `frontend/src/components/subscription/SubscriptionPlanCard.tsx`, `PackageCard.tsx` — планы в `Card` с выделением текущего (`ring-2 ring-primary`), фичи списком с Check-иконками, пакеты grid `sm:grid-cols-2 lg:grid-cols-4`
- Modify: `frontend/src/app/dashboard/profile/ProfileClient.tsx` — Card-секции
- Modify: `frontend/src/app/dashboard/applications/[id]/ApplicationDetailClient.tsx` — Card-секции

- [ ] **Step 1–14:** по одному файлу за шаг: правка → `pnpm -C frontend typecheck && pnpm -C frontend test` (обновить сломанные тесты страниц — только разметку/квери, не логику) → commit `feat(frontend): redesign <страница>`.
- [ ] **Step 15: Смоук всех dashboard-страниц** на desktop и mobile.

---

### Task 10: Чистка контейнеров страниц

По правилу Phase 1: страницы не задают внешний `max-w-*`.

**Files:** все файлы из результата команды ниже.

- [ ] **Step 1: Найти нарушения**

```bash
grep -rln "max-w-4xl\|max-w-3xl\|max-w-5xl" frontend/src/app
```

- [ ] **Step 2: Убрать внешние ограничители**

В каждом файле удалить `max-w-4xl/3xl/5xl mx-auto` с корневых обёрток страниц (контент займёт ширину контейнера AppShell). Оставить `mx-auto max-w-2xl` только на формах (создание/редактирование) и `max-w-md` на auth.

- [ ] **Step 3: Проверить + Commit**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`

```bash
git add frontend/src/app
git commit -m "refactor(frontend): unified page container — remove per-page width overrides"
```

---

### Task 11: Финальная верификация Phase 3

- [ ] **Step 1:** `pnpm -C frontend typecheck && pnpm -C frontend test && pnpm -C frontend build` — 0 ошибок.
- [ ] **Step 2:** Grep-проверки качества:

```bash
grep -rn "bg-white\|text-gray-\|bg-gray-\|border-gray-" frontend/src/app frontend/src/components | grep -v ui/ ; echo "---"
grep -rn "<select" frontend/src/app frontend/src/components | grep -v ui/
```

Expected: пусто (или осознанные исключения).

- [ ] **Step 3: Ручной чеклист (desktop 1440px, tablet 820px, mobile 390px):**

- [ ] /vacancies: фильтры-sidebar (desktop) / Sheet (mobile), карточки с 👁/📨, пагинация, empty при отсутствии результатов
- [ ] /vacancies/[id], /resumes, /resumes/[id], /companies, /companies/[id]
- [ ] Все /dashboard/\* страницы + /subscription
- [ ] Формы создания/редактирования всех сущностей
- [ ] /login, /register
- [ ] Нигде нет горизонтального скролла на 390px
- [ ] Tab-навигация по фильтрам и формам работает (a11y)

---

## Self-Review

- Спека §1 (все страницы/компоненты/формы/модалки/таблицы/карточки/навигация/поиск/фильтры/empty/loading/error) — Tasks 1–10 покрывают все 30 файлов страниц из `frontend/src/app` (сверено со списком файлов); навигация — Phase 1; главная и кабинет — Phase 4 ✅
- §7 (фильтры: desktop видимы, mobile — Sheet c поиском и кнопкой на странице) — Task 3–4 ✅
- §10 (👁/📨 на карточке, карточка компактна) — Task 2 ✅
- §2 (shadcn-компоненты: Button, Input, Select, Dialog, Sheet, Popover✳, DropdownMenu, Card, Badge, Tabs, Tooltip, Table, Pagination, Skeleton, Toast=sonner, Alert) — задействованы; Combobox (`Command`) — не понадобился в фильтрах, остаётся доступным ✳Popover используется DropdownMenu/Select внутренне ✅
- Тип `Draft` в Task 3 согласован с `VacancyListParams`; `PaginationBar` пропсы (`page`, `pageCount`, `onPageChange`) согласованы между Task 1 и потребителями ✅
