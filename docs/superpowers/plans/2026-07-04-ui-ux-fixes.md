# UI/UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть 18 UI/UX-правок из `docs/ui-ux-features.md` (спека: `docs/superpowers/specs/2026-07-04-ui-ux-fixes-design.md`).

**Architecture:** Только frontend (Next.js 15 App Router, TailwindCSS 4, Shadcn/UI, MobX, i18next). Бэкенд готов: `GET /vacancies` уже фильтрует по `industry`/`specialization` (documentId), `salaryFrom/To`, `salaryCurrency`; `GET /industries` существует. Работа в одной ветке, коммит на задачу.

**Tech Stack:** React 19, TypeScript strict (`exactOptionalPropertyTypes` — использовать conditional spread!), vitest + @testing-library/react.

**Рабочая директория команд:** корень репо. Команды frontend: `pnpm --filter frontend typecheck`, `pnpm --filter frontend test`.

**Важные факты о кодовой базе:**

- Layout `frontend/src/components/layout/AppShell.tsx:18` уже оборачивает контент в `<div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">` — все page-врапперы `container px-4 py-8` дублируют его.
- API-клиент: `import { api } from '@/services/api'` (метод `api.get<T>(path)`).
- `VacancyListParams` (frontend/src/types/api.ts:219) уже содержит `industry?`, `specialization?`, `salaryFrom?`, `salaryTo?`, `salaryCurrency?` — типы менять не нужно.
- `VacancyStore.fetchVacancies` сериализует все параметры generically через `URLSearchParams.append` — новые параметры пройдут без изменений стора.
- Тип `Industry` (types/api.ts:268): `{ id, documentId, slug, name: { ru, en }, specializations: Specialization[] }`.

---

### Task 0: Ветка

- [ ] **Step 1: Создать ветку**

```bash
git checkout -b feature/ui-ux-fixes
```

---

### Task 1: cursor-pointer для кнопок (пункты 9, 10)

**Files:**

- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Добавить правило в `@layer base`**

В `globals.css` внутри существующего `@layer base` (после блоков с переменными, рядом с другими базовыми правилами; если базовых element-правил нет — добавить в конец `@layer base`):

```css
button:not(:disabled),
[role='button']:not([aria-disabled='true']) {
  cursor: pointer;
}
```

Причина: Tailwind 4 preflight ставит `cursor: default` на `<button>`. Правило закрывает Shadcn Button, кнопку аватара в WebHeader, триггеры Select/Dropdown/Popover/Sheet (все — `<button>`).

- [ ] **Step 2: Проверка**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS (CSS не влияет на тесты).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "fix(frontend): add cursor-pointer to buttons via base CSS layer"
```

---

### Task 2: Убрать gap-6 у Card (пункт 15)

**Files:**

- Modify: `frontend/src/components/ui/card.tsx:10`

- [ ] **Step 1: Убрать `gap-6` из базового класса Card**

Было (строка 10):

```tsx
'flex flex-col gap-6 rounded-xl border bg-card text-card-foreground shadow-sm',
```

Стало:

```tsx
'flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm',
```

Отступы обеспечиваются паддингами слотов: `CardHeader` — `px-6 pt-6`, `CardContent` — `p-6`, `CardFooter` — `px-6 pb-6`.

- [ ] **Step 2: Тесты + typecheck**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS. Если какой-то тест проверяет классы Card — обновить ожидание (убрать `gap-6`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/card.tsx
git commit -m "fix(frontend): remove gap-6 from Card base class (slots have own padding)"
```

Примечание для финальной визуальной проверки (Task 15): если где-то между CardHeader и CardFooter без CardContent контент «слипнется» — добавить точечный `className` в том месте, не возвращать глобальный gap.

---

### Task 3: Bell в стиле Globe (пункт 12)

**Files:**

- Modify: `frontend/src/components/notification/NotificationBadge.tsx`

- [ ] **Step 1: Переписать разметку NotificationBadge**

Заменить возвращаемый JSX (строки 16–29) на ghost-Button как у LanguageSwitcher (`WebHeader.tsx:45`):

```tsx
'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Bell } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'

export const NotificationBadge = observer(function NotificationBadge() {
  const { notification } = useStores()

  useEffect(() => {
    void notification.fetchUnreadCount()
  }, [notification])

  return (
    <Button asChild variant="ghost" size="icon" className="relative h-8 w-8">
      <Link href="/dashboard/notifications" aria-label="Уведомления">
        <Bell className="h-4 w-4" />
        {notification.unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
          </span>
        )}
      </Link>
    </Button>
  )
})
```

- [ ] **Step 2: Тесты + typecheck**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS (если есть тест NotificationBadge, проверяющий разметку — обновить селекторы).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/notification/NotificationBadge.tsx
git commit -m "fix(frontend): match Bell icon style to Globe (ghost icon button)"
```

---

### Task 4: Имя пользователя после аватара (пункт 11)

**Files:**

- Modify: `frontend/src/components/layout/WebHeader.tsx:121-134`

- [ ] **Step 1: Добавить имя в кнопку-триггер аватара**

Заменить кнопку-триггер (строки 122–134):

```tsx
<DropdownMenuTrigger asChild>
  <button
    type="button"
    aria-label={t('nav.userMenu')}
    className="flex items-center gap-2 rounded-full outline-none ring-ring focus-visible:ring-2"
  >
    <Avatar className="h-8 w-8">
      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
        {initial.toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
      {auth.user.firstName ?? auth.user.email}
    </span>
  </button>
</DropdownMenuTrigger>
```

`hidden sm:inline` — на мобильных имя скрыто (решение пользователя). Cursor-pointer уже закрыт Task 1.

- [ ] **Step 2: Тесты + typecheck**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/WebHeader.tsx
git commit -m "feat(frontend): show user name next to avatar in header (hidden on mobile)"
```

---

### Task 5: Логотип и отступ форм авторизации (пункты 1, 2)

**Files:**

- Modify: `frontend/src/app/(auth)/login/page.tsx`
- Modify: `frontend/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: login/page.tsx — враппер и логотип**

Строка 16, было:

```tsx
<div className="flex min-h-screen items-center justify-center p-4">
```

Стало (убираем вертикальное центрирование, фиксированный отступ сверху — форма не «прыгает» при переходе login ↔ register):

```tsx
<div className="flex min-h-screen justify-center p-4 pt-12 sm:pt-16">
```

Строка 19, было:

```tsx
<Image src="/logo-vertical.png" alt="GramJob" width={80} height={80} priority />
```

Стало (крупнее и гарантированно по центру):

```tsx
<Image
  src="/logo-vertical.png"
  alt="GramJob"
  width={120}
  height={120}
  priority
  className="mx-auto"
/>
```

- [ ] **Step 2: register/page.tsx — те же правки**

Строка 15: тот же враппер `flex min-h-screen justify-center p-4 pt-12 sm:pt-16`.
Строка 18: тот же `<Image ... width={120} height={120} className="mx-auto" />`.

- [ ] **Step 3: Тесты + typecheck**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/(auth)/login/page.tsx" "frontend/src/app/(auth)/register/page.tsx"
git commit -m "fix(frontend): center and enlarge auth logo, equal top offset on auth forms"
```

---

### Task 6: Логотип в Hero (пункт 3)

**Files:**

- Modify: `frontend/src/app/page.tsx:19-26`

- [ ] **Step 1: Увеличить логотип**

Было:

```tsx
<Image
  src="/logo-vertical.png"
  alt="GramJob"
  width={140}
  height={160}
  priority
  className="animate-fade-in-up mb-6 h-auto w-28 rounded-2xl bg-white/95 p-3 sm:w-32"
/>
```

Стало:

```tsx
<Image
  src="/logo-vertical.png"
  alt="GramJob"
  width={180}
  height={206}
  priority
  className="animate-fade-in-up mb-6 h-auto w-36 rounded-2xl bg-white/95 p-3 sm:w-44"
/>
```

- [ ] **Step 2: Проверка + Commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test` → PASS.

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(frontend): enlarge hero logo on home page"
```

---

### Task 7: Убрать дублирующие контейнеры страниц (пункт 8)

**Files (полный список из grep, все — Modify):**

Врапперы `container px-4 py-8` (удалить div полностью, отдать children напрямую):

- `frontend/src/app/resumes/page.tsx:10`
- `frontend/src/app/resumes/[id]/page.tsx:10`
- `frontend/src/app/subscription/page.tsx:9`
- `frontend/src/app/vacancies/[id]/page.tsx:34`
- `frontend/src/app/companies/[id]/page.tsx:34`
- `frontend/src/app/dashboard/favorites/page.tsx:5`
- `frontend/src/app/dashboard/blocks/page.tsx:5`
- `frontend/src/app/dashboard/resumes/page.tsx:5`
- `frontend/src/app/dashboard/resumes/[id]/analytics/page.tsx:10`
- `frontend/src/app/dashboard/applications/page.tsx:5`
- `frontend/src/app/dashboard/applications/[id]/page.tsx:10`
- `frontend/src/app/dashboard/saved-searches/page.tsx:5`
- `frontend/src/app/dashboard/notifications/page.tsx:5`
- `frontend/src/app/dashboard/companies/page.tsx:10`
- `frontend/src/app/dashboard/vacancies/page.tsx:5`
- `frontend/src/app/dashboard/vacancies/[id]/applications/page.tsx:10`
- `frontend/src/app/dashboard/vacancies/[id]/analytics/page.tsx:10`

Врапперы с ограничением ширины (`container mx-auto max-w-* px-4 py-8`) — сохранить только ограничение ширины: `mx-auto w-full max-w-2xl` (или `max-w-3xl`, как было):

- `frontend/src/app/dashboard/resumes/new/page.tsx:5` (max-w-3xl)
- `frontend/src/app/dashboard/resumes/[id]/edit/page.tsx:10` (max-w-3xl)
- `frontend/src/app/dashboard/profile/page.tsx:5` (max-w-2xl)
- `frontend/src/app/dashboard/companies/new/page.tsx:10` (max-w-2xl)
- `frontend/src/app/dashboard/companies/[id]/edit/page.tsx:15` (max-w-2xl)
- `frontend/src/app/dashboard/vacancies/new/page.tsx:5` (max-w-2xl)
- `frontend/src/app/dashboard/vacancies/[id]/edit/page.tsx:15` (max-w-2xl)

- [ ] **Step 1: Убрать простые врапперы**

Обоснование: AppShell (`components/layout/AppShell.tsx:18`) уже даёт `mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8` — page-level `container px-4 py-8` создаёт двойной паддинг. Пример (resumes/page.tsx), было:

```tsx
export default function ResumesPage() {
  return (
    <div className="container px-4 py-8">
      <ResumesClient />
    </div>
  )
}
```

Стало:

```tsx
export default function ResumesPage() {
  return <ResumesClient />
}
```

Применить ко всем 17 файлам первой группы (если внутри div несколько детей — заменить на `<>...</>`).

- [ ] **Step 2: Сузить врапперы второй группы**

Пример (dashboard/vacancies/new/page.tsx), было:

```tsx
<div className="container mx-auto max-w-2xl px-4 py-8">
```

Стало:

```tsx
<div className="mx-auto w-full max-w-2xl">
```

- [ ] **Step 3: Проверить, что вхождений не осталось**

Run: `grep -rn '"container' frontend/src/app --include="*.tsx" | grep className`
Expected: пусто.

- [ ] **Step 4: Тесты + typecheck**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app
git commit -m "fix(frontend): remove page-level container wrappers duplicating AppShell padding"
```

---

### Task 8: Заголовок под ссылкой «back» в формах (пункт 14)

**Files:**

- Modify: `frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.tsx:45`
- Modify: `frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.tsx:79`
- Modify: `frontend/src/app/dashboard/companies/new/CreateCompanyClient.tsx:31`
- Modify: `frontend/src/app/dashboard/companies/[id]/edit/EditCompanyClient.tsx:60`

- [ ] **Step 1: Заменить горизонтальный блок на вертикальный (4 файла)**

Текущий паттерн во всех четырёх файлах:

```tsx
<div className="flex items-center gap-4">
  <Link href="..." className="text-sm text-muted-foreground hover:text-foreground">
    ← Мои вакансии
  </Link>
  <h1 className="text-2xl font-bold">Новая вакансия</h1>
</div>
```

Заменить на (Link — блочный элемент, заголовок под ним):

```tsx
<div className="space-y-1">
  <Link href="..." className="inline-block text-sm text-muted-foreground hover:text-foreground">
    ← Мои вакансии
  </Link>
  <h1 className="text-2xl font-bold">Новая вакансия</h1>
</div>
```

href и тексты в каждом файле оставить как есть — меняется только структура/классы.

- [ ] **Step 2: Тесты + typecheck + Commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test` → PASS.

```bash
git add frontend/src/app/dashboard
git commit -m "fix(frontend): place page title under back link on create/edit forms"
```

---

### Task 9: Убрать лейбл «Фильтры» (пункт 5)

**Files:**

- Modify: `frontend/src/components/vacancy/VacancyFilters.tsx:198-201`
- Modify: `frontend/src/app/companies/CompaniesClient.tsx:77`
- Modify: `frontend/src/app/resumes/ResumesClient.tsx:105`

- [ ] **Step 1: VacancyFilters — убрать CardHeader**

Было (строки 198–202):

```tsx
<Card className="hidden md:block">
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Фильтры</CardTitle>
  </CardHeader>
  <CardContent>
```

Стало:

```tsx
<Card className="hidden md:block">
  <CardContent>
```

Удалить неиспользуемые импорты `CardHeader`, `CardTitle` из строки 14. Текст «Фильтры» на мобильной кнопке-триггере Sheet (строка 172) и в `SheetTitle` (строка 180) — **оставить** (это кнопка и заголовок модалки, не лейбл панели).

- [ ] **Step 2: CompaniesClient и ResumesClient — удалить `<p>Фильтры</p>`**

В обоих файлах удалить строку `<p className="text-sm font-semibold text-card-foreground">Фильтры</p>`.

- [ ] **Step 3: Тесты + typecheck + Commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test` → PASS (обновить тесты, если ссылались на текст «Фильтры» в desktop-панели).

```bash
git add frontend/src/components/vacancy/VacancyFilters.tsx frontend/src/app/companies/CompaniesClient.tsx frontend/src/app/resumes/ResumesClient.tsx
git commit -m "fix(frontend): remove redundant Filters label from filter panels"
```

---

### Task 10: MultiSelect — показывать выбранные значения (пункт 6)

**Files:**

- Create: `frontend/src/components/ui/multi-select.test.tsx`
- Modify: `frontend/src/components/ui/multi-select.tsx:40-45`

- [ ] **Step 1: Написать падающий тест**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultiSelect } from './multi-select'

const OPTIONS = [
  { value: 'remote', label: 'Удалённо' },
  { value: 'office', label: 'Офис' },
  { value: 'hybrid', label: 'Гибрид' },
]

describe('MultiSelect', () => {
  it('показывает label, когда ничего не выбрано', () => {
    render(<MultiSelect label="Все форматы" options={OPTIONS} value={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox').textContent).toContain('Все форматы')
  })

  it('показывает label выбранного значения при одном выбранном', () => {
    render(
      <MultiSelect label="Все форматы" options={OPTIONS} value={['office']} onChange={vi.fn()} />
    )
    expect(screen.getByRole('combobox').textContent).toContain('Офис')
  })

  it('перечисляет выбранные значения через запятую при нескольких выбранных', () => {
    render(
      <MultiSelect
        label="Все форматы"
        options={OPTIONS}
        value={['remote', 'office']}
        onChange={vi.fn()}
      />
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger.textContent).toContain('Удалённо, Офис')
    expect(trigger.textContent).not.toContain('Все форматы:')
  })

  it('сохраняет каунтер при нескольких выбранных', () => {
    render(
      <MultiSelect
        label="Все форматы"
        options={OPTIONS}
        value={['remote', 'office']}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('2')).toBeDefined()
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `pnpm --filter frontend test multi-select`
Expected: FAIL — тест «перечисляет выбранные значения» получает `Все форматы: 2`.

- [ ] **Step 3: Реализация**

В `multi-select.tsx` заменить вычисление `labelText` (строки 40–45):

```tsx
const labelText =
  value.length === 0
    ? label
    : value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ')
```

Обрезка длинной строки уже есть: `<span className="truncate">` (строка 56); каунтер-бейдж при `value.length > 1` (строки 58–62) не трогаем.

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm --filter frontend test multi-select` → PASS. Затем `pnpm --filter frontend typecheck && pnpm --filter frontend test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/multi-select.tsx frontend/src/components/ui/multi-select.test.tsx
git commit -m "feat(frontend): show selected option labels in MultiSelect trigger with truncation"
```

---

### Task 11: Новые фильтры вакансий — отрасль, специализация, зарплата (пункт 7)

**Files:**

- Modify: `frontend/src/components/vacancy/VacancyFilters.tsx`

Типы и стор менять не нужно (см. «Важные факты»). Значение фильтра — `documentId` (бэкенд: `filters.industry = { documentId: { $eq: industry } }`, vacancy.ts:427).

- [ ] **Step 1: Расширить Draft и draftFromParams**

```tsx
type Draft = {
  country: string
  industry: string
  specialization: string
  workFormat: WorkFormatEnum[]
  employmentType: EmploymentTypeEnum[]
  seniority: SeniorityEnum[]
  salaryFrom: string
  salaryTo: string
  salaryCurrency: string
  sort: string
}

function draftFromParams(params: VacancyListParams): Draft {
  return {
    country: params.country ?? '',
    industry: params.industry ?? '',
    specialization: params.specialization ?? '',
    workFormat: params.workFormat ?? [],
    employmentType: params.employmentType ?? [],
    seniority: params.seniority ?? [],
    salaryFrom: params.salaryFrom != null ? String(params.salaryFrom) : '',
    salaryTo: params.salaryTo != null ? String(params.salaryTo) : '',
    salaryCurrency: params.salaryCurrency ?? '',
    sort: params.sort ?? '',
  }
}

function countActive(draft: Draft): number {
  return [
    draft.country,
    draft.industry,
    draft.specialization,
    draft.salaryFrom,
    draft.salaryTo,
    ...draft.workFormat,
    ...draft.employmentType,
    ...draft.seniority,
  ].filter(Boolean).length
}
```

- [ ] **Step 2: Загрузка отраслей в VacancyFilters**

По паттерну `VacancyForm.tsx:113-118`. Добавить импорты:

```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import type { Industry, SalaryCurrencyEnum } from '@/types/api'
import { Input } from '@/components/ui/input'
```

В компоненте `VacancyFilters` (state поднимаем сюда, передаём в FilterFields пропсом):

```tsx
const [industries, setIndustries] = useState<Industry[]>([])

useEffect(() => {
  void api
    .get<Industry[]>('/industries')
    .then((res) => setIndustries(res))
    .catch(() => {})
}, [])
```

- [ ] **Step 3: Поля в FilterFields**

Сигнатура: `function FilterFields({ draft, setDraft, industries }: { draft: Draft; setDraft: (d: Draft) => void; industries: Industry[] })`. Имя отрасли — по текущей локали: внутри FilterFields `const { i18n } = useTranslation()`, `const lang = i18n.language === 'en' ? 'en' : 'ru'`.

После блока «Страна» добавить:

```tsx
<div className="space-y-1.5">
  <Label>Отрасль</Label>
  <Select
    value={draft.industry || ALL}
    onValueChange={(v) =>
      setDraft({ ...draft, industry: v === ALL ? '' : v, specialization: '' })
    }
  >
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>Все отрасли</SelectItem>
      {industries.map((ind) => (
        <SelectItem key={ind.documentId} value={ind.documentId}>
          {ind.name[lang]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
<div className="space-y-1.5">
  <Label>Специализация</Label>
  <Select
    value={draft.specialization || ALL}
    onValueChange={(v) => setDraft({ ...draft, specialization: v === ALL ? '' : v })}
    disabled={!draft.industry}
  >
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>Все специализации</SelectItem>
      {(industries.find((i) => i.documentId === draft.industry)?.specializations ?? []).map(
        (spec) => (
          <SelectItem key={spec.documentId} value={spec.documentId}>
            {spec.name[lang]}
          </SelectItem>
        )
      )}
    </SelectContent>
  </Select>
</div>
<div className="space-y-1.5">
  <Label>Зарплата</Label>
  <div className="flex gap-2">
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      placeholder="От"
      value={draft.salaryFrom}
      onChange={(e) => setDraft({ ...draft, salaryFrom: e.target.value })}
    />
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      placeholder="До"
      value={draft.salaryTo}
      onChange={(e) => setDraft({ ...draft, salaryTo: e.target.value })}
    />
  </div>
  <Select
    value={draft.salaryCurrency || ALL}
    onValueChange={(v) => setDraft({ ...draft, salaryCurrency: v === ALL ? '' : v })}
  >
    <SelectTrigger className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>Любая валюта</SelectItem>
      {(['USD', 'EUR', 'RUB', 'GBP'] as SalaryCurrencyEnum[]).map((c) => (
        <SelectItem key={c} value={c}>
          {c}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Оба вызова `<FilterFields draft={draft} setDraft={setDraft} />` (mobile Sheet и desktop Card) получают `industries={industries}`.

- [ ] **Step 4: apply() — пробросить новые параметры**

Дополнить `apply` (после строки `if (d.country) ...`):

```tsx
if (d.industry) next.industry = d.industry
if (d.specialization) next.specialization = d.specialization
if (d.salaryFrom) next.salaryFrom = Number(d.salaryFrom)
if (d.salaryTo) next.salaryTo = Number(d.salaryTo)
if (d.salaryCurrency) next.salaryCurrency = d.salaryCurrency as SalaryCurrencyEnum
```

- [ ] **Step 5: Тесты**

`VacanciesClient.test.tsx` рендерит VacancyFilters → появится реальный вызов `api.get('/industries')`. Если `@/services/api` там не замокан — добавить в начало теста:

```tsx
vi.mock('@/services/api', () => ({
  api: { get: vi.fn().mockResolvedValue([]) },
}))
```

(Если mock уже есть — убедиться, что `get('/industries')` возвращает массив.)

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/vacancy/VacancyFilters.tsx frontend/src/app/vacancies/VacanciesClient.test.tsx
git commit -m "feat(frontend): add industry, specialization and salary filters to vacancies"
```

---

### Task 12: CompanyFilters как у вакансий (пункт 13)

**Files:**

- Create: `frontend/src/components/company/CompanyFilters.tsx`
- Modify: `frontend/src/app/companies/CompaniesClient.tsx`

- [ ] **Step 1: Создать CompanyFilters**

Полная копия структуры `VacancyFilters` (mobile Sheet + desktop Card, draft, apply/reset), но с полями компаний:

```tsx
'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { CompanyListParams, CompanySizeEnum } from '@/types/api'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { CountrySelect } from '@/components/ui/country-select'

interface Props {
  params: CompanyListParams
  onChange: (params: CompanyListParams) => void
}

const ALL = '__all__'

type Draft = {
  country: string
  companySize: CompanySizeEnum | ''
}

function draftFromParams(params: CompanyListParams): Draft {
  return {
    country: params.country ?? '',
    companySize: params.companySize ?? '',
  }
}

function countActive(draft: Draft): number {
  return [draft.country, draft.companySize].filter(Boolean).length
}

function FilterFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Страна</Label>
        <CountrySelect
          value={draft.country}
          onChange={(v) => setDraft({ ...draft, country: v })}
          placeholder="Любая страна"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Размер компании</Label>
        <Select
          value={draft.companySize || ALL}
          onValueChange={(v) =>
            setDraft({ ...draft, companySize: v === ALL ? '' : (v as CompanySizeEnum) })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Любой размер</SelectItem>
            {(Object.entries(COMPANY_SIZE_LABELS) as [CompanySizeEnum, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function CompanyFilters({ params, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(draftFromParams(params))
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeCount = countActive(draftFromParams(params))

  const apply = (d: Draft = draft) => {
    const next: CompanyListParams = { page: 1 }
    if (params.search) next.search = params.search
    if (d.country) next.country = d.country
    if (d.companySize) next.companySize = d.companySize
    onChange(next)
    setSheetOpen(false)
  }

  const reset = () => {
    setDraft(draftFromParams({}))
    onChange({ page: 1 })
    setSheetOpen(false)
  }

  return (
    <div>
      <div className="mb-3 md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
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
              <Button className="flex-1" onClick={() => apply()}>
                Применить
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="hidden md:block">
        <CardContent>
          <FilterFields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => apply()}>
              Применить
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

Примечание: если в `CompanyListParams` нет полей `search`/`country`/`companySize`/`page` — проверить `frontend/src/types/api.ts` (тип существует со Sprint 2 и содержит их).

- [ ] **Step 2: Переписать CompaniesClient на params-объект**

По образцу `VacanciesClient`: состояние `const [params, setParams] = useState<CompanyListParams>({ page: 1 })`, отдельный `searchInput`. Заменить `aside`-разметку:

```tsx
<aside className="md:sticky md:top-20">
  <CompanyFilters params={params} onChange={handleParamsChange} />
</aside>
```

Обработчики:

```tsx
const handleParamsChange = (next: CompanyListParams) => {
  setParams(next)
  void store.fetchCompanies(next)
}

const handlePageChange = (page: number) => {
  const next = { ...params, page }
  setParams(next)
  void store.fetchCompanies(next)
}

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault()
  const next: CompanyListParams = { ...params, page: 1 }
  if (searchInput) {
    next.search = searchInput
  } else {
    delete next.search
  }
  setParams(next)
  void store.fetchCompanies(next)
}
```

Удалить локальные состояния `country`/`companySize` и старую aside-разметку с Select. Удалить неиспользуемые импорты (`Label`, `Select*`, `CountrySelect`, `COMPANY_SIZE_LABELS`).

- [ ] **Step 3: Тесты + typecheck + Commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test` → PASS (поправить CompaniesClient-тесты при наличии).

```bash
git add frontend/src/components/company/CompanyFilters.tsx frontend/src/app/companies/CompaniesClient.tsx
git commit -m "feat(frontend): unify companies filters with vacancies filter panel structure"
```

---

### Task 13: Avatar на /dashboard/profile (пункт 16)

**Files:**

- Modify: `frontend/src/app/dashboard/profile/ProfileClient.tsx`

- [ ] **Step 1: Добавить Avatar рядом с именем**

Импорт: `import { Avatar, AvatarFallback } from '@/components/ui/avatar'`.

Заменить `<PageHeader title={...} />` (строка 33) на:

```tsx
<div className="flex items-center gap-4">
  <Avatar className="h-16 w-16">
    <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
      {(user.firstName?.charAt(0) ?? user.email?.charAt(0) ?? '?').toUpperCase()}
    </AvatarFallback>
  </Avatar>
  <PageHeader title={`${user.firstName} ${user.lastName}`} />
</div>
```

`PageHeader` имеет `mb-6` — визуально проверить на финальном прогоне; при перекосе добавить `className`-обёртке `items-start` или обернуть PageHeader в div c `[&>div]:mb-0` — решить по факту в Task 15 (визуальная проверка).

- [ ] **Step 2: Тесты + typecheck + Commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test` → PASS.

```bash
git add frontend/src/app/dashboard/profile/ProfileClient.tsx
git commit -m "feat(frontend): add avatar to profile page"
```

---

### Task 14: Подписка — Free-план, порядок, VIP-описание, иконка Stars (пункты 17, 18)

**Files:**

- Create: `frontend/src/components/icons/TelegramStarIcon.tsx`
- Create: `frontend/src/components/subscription/StarsPrice.tsx`
- Modify: `frontend/src/lib/subscription-utils.ts`
- Modify: `frontend/src/lib/subscription-utils.test.ts`
- Modify: `frontend/src/components/subscription/SubscriptionPlanCard.tsx`
- Modify: `frontend/src/components/subscription/PackageCard.tsx`
- Modify: `frontend/src/app/subscription/SubscriptionClient.tsx:99,185-205`

- [ ] **Step 1: TelegramStarIcon**

```tsx
import type { SVGProps } from 'react'

export function TelegramStarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 2.25l2.98 6.04 6.67.97-4.83 4.7 1.14 6.64L12 17.47 6.04 20.6l1.14-6.64-4.83-4.7 6.67-.97L12 2.25z" />
    </svg>
  )
}
```

- [ ] **Step 2: StarsPrice-компонент вместо строки с ★**

`formatStarsPrice` в `subscription-utils.ts:15-18` возвращает `` `${price} ★` ``. Заменить на числовой форматтер + JSX-компонент. В `subscription-utils.ts`:

```ts
export function formatStarsAmount(price: number | null): string | null {
  if (price === null || price === undefined) return null
  return String(price)
}
```

(Старую `formatStarsPrice` удалить; её тест в `subscription-utils.test.ts` заменить тестом `formatStarsAmount`: `null → null`, `299 → '299'`.)

Create: `frontend/src/components/subscription/StarsPrice.tsx`:

```tsx
import { formatStarsAmount } from '@/lib/subscription-utils'
import { TelegramStarIcon } from '@/components/icons/TelegramStarIcon'

export function StarsPrice({ price, className }: { price: number | null; className?: string }) {
  const amount = formatStarsAmount(price)
  if (amount === null) return <span className={className}>Бесплатно</span>
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      {amount}
      <TelegramStarIcon className="h-4 w-4 text-amber-500" />
    </span>
  )
}
```

Заменить использования: в `SubscriptionPlanCard.tsx:28-30` — `<p className="text-base font-bold text-card-foreground"><StarsPrice price={plan.starsPrice} /></p>`; в `PackageCard.tsx` — найти вызов `formatStarsPrice(...)` и заменить на `<StarsPrice price={...} />` аналогично.

- [ ] **Step 3: Free-план и порядок в SubscriptionClient**

Заменить строку 99 (`const paidPlans = payment.plans.filter((p) => p.code !== 'free')`):

```tsx
const PLAN_ORDER = ['free', 'pro', 'max', 'vip']
const orderedPlans = [...payment.plans].sort(
  (a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code)
)
```

В секции «Планы подписки» заменить `paidPlans` на `orderedPlans` (обе ссылки: условие `.length > 0` и `.map`), сетку `sm:grid-cols-3` → `sm:grid-cols-2 lg:grid-cols-4` (4 карточки).

- [ ] **Step 4: VIP-фичи в SubscriptionPlanCard**

`SubscriptionPlanCard.tsx` — после `</ul>` (строка 57) добавить:

```tsx
{
  plan.code === 'vip' && (
    <ul className="space-y-1.5 border-t pt-3 text-sm text-muted-foreground">
      <li>VIP-бейдж на компании и вакансиях</li>
      <li>Блок «Рекомендуем» на главной</li>
      <li>Ускоренная модерация (&lt; 4 ч)</li>
      <li>Приоритет в поиске</li>
    </ul>
  )
}
```

Кнопка покупки уже скрыта для free (`plan.code !== 'free'`, строка 59). Для free добавить перед закрывающим `</div>` (после блока кнопки) отметку активности не нужно — «Активный» уже показывается в шапке карточки.

- [ ] **Step 5: Тесты + typecheck**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS после обновления `subscription-utils.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/icons/TelegramStarIcon.tsx frontend/src/components/subscription frontend/src/lib/subscription-utils.ts frontend/src/lib/subscription-utils.test.ts frontend/src/app/subscription/SubscriptionClient.tsx
git commit -m "feat(frontend): show free plan, reorder plans, expand VIP card, add Telegram star icon"
```

---

### Task 15: Промежуточная визуальная проверка (блоки A–I)

- [ ] **Step 1: Запустить dev-серверы**

```bash
docker compose up -d
pnpm --filter backend dev   # фон
pnpm --filter frontend dev  # фон
```

- [ ] **Step 2: Пройти чеклист в браузере**

- `/login`, `/register`: логотип крупный и по центру; формы на одинаковом отступе сверху (переход не «прыгает»).
- `/`: Hero-логотип увеличен.
- `/vacancies`: нет лейбла «Фильтры» (desktop); новые фильтры отрасль/специализация/зарплата работают (проверить query string и результаты); MultiSelect при 2+ значениях перечисляет их с «…» и каунтером.
- `/companies`: фильтры выглядят как на вакансиях (Card desktop / Sheet mobile).
- `/resumes`: нет двойного паддинга; нет лейбла «Фильтры».
- Header: Bell и Globe одного стиля; имя после аватара (desktop); у аватара/кнопок курсор pointer.
- Формы создания вакансии/компании: заголовок под back-ссылкой; между card-header и card-content нет огромного отступа.
- `/dashboard/profile`: аватар отображается, выравнивание нормальное (если нет — поправить, см. Task 13).
- `/subscription`: порядок free→pro→max→vip; у VIP полный список фич; цены с иконкой Telegram Stars.
- Все карточки (vacancy, resume, company, dashboard) — проверить отступы после удаления gap-6.

- [ ] **Step 3: Зафиксировать правки, если что-то поехало**

Точечные фиксы — отдельным коммитом:

```bash
git add -A frontend/src
git commit -m "fix(frontend): visual polish after UI/UX fixes pass"
```

---

### Task 16: i18n — словарь enum-меток (часть пункта 4)

**Files:**

- Modify: `frontend/src/locales/ru/common.json`, `frontend/src/locales/en/common.json`
- Modify: `frontend/src/lib/vacancy-utils.ts` (+ его тест), `frontend/src/lib/resume-utils.ts` (+ тест), `frontend/src/lib/company-utils.ts` (+ тест), `frontend/src/lib/moderation-utils.ts` (+ тест), `frontend/src/lib/subscription-utils.ts`
- Modify: все компоненты, использующие `*_LABELS` (найти: `grep -rln "_LABELS" frontend/src --include="*.tsx"`)

**Конвенция ключей:** `enums.<group>.<value>`, например `enums.workFormat.remote`, `enums.companySize.size_1_10`, `enums.vacancyStatus.draft`, `enums.rejectionReason.spam`.

- [ ] **Step 1: Добавить секцию enums в оба common.json**

RU (значения взять из существующих `*_LABELS`-констант — они источник истины для ru), EN — перевести. Группы: `workFormat`, `employmentType`, `seniority`, `companySize`, `resumeWorkFormat`, `resumeEmploymentType`, `vacancyStatus`, `resumeStatus`, `companyStatus`, `applicationStatus`, `rejectionReason`. Пример фрагмента RU:

```json
"enums": {
  "workFormat": { "remote": "Удалённо", "office": "Офис", "hybrid": "Гибрид" },
  "seniority": { "junior": "Junior", "middle": "Middle", "senior": "Senior", "lead": "Lead" }
}
```

(Точные наборы значений — из существующих констант; ничего не выдумывать, переносить 1:1.)

- [ ] **Step 2: В utils добавить массивы значений, метки читать через t()**

Паттерн (vacancy-utils.ts):

```ts
export const WORK_FORMAT_VALUES = [
  'remote',
  'office',
  'hybrid',
] as const satisfies readonly WorkFormatEnum[]
```

(порядок и состав — как в текущем `WORK_FORMAT_LABELS`). В компонентах заменить:

```tsx
// было
options={(Object.entries(WORK_FORMAT_LABELS) as [WorkFormatEnum, string][]).map(
  ([value, label]) => ({ value, label })
)}
// стало
options={WORK_FORMAT_VALUES.map((value) => ({
  value,
  label: t(`enums.workFormat.${value}`),
}))}
```

и одиночные рендеры `WORK_FORMAT_LABELS[v]` → `t(\`enums.workFormat.${v}\`)`. Компонент должен иметь `const { t } = useTranslation()`. Ту же замену выполнить для всех групп во всех компонентах-потребителях (VacancyFilters, VacancyCard, VacancyForm, ResumesClient, ResumeCard, ResumeForm, CompanyFilters, CompanyCard, CompanyForm, статус-бейджи, RejectionNotice и др. — по результату grep).

- [ ] **Step 3: Удалить неиспользуемые `*_LABELS` и обновить тесты**

Когда потребителей у `*_LABELS` не осталось — удалить константу и её тест (или заменить тест на проверку `*_VALUES`). Если константа используется вне React (например, в утилите без t) — оставить и пометить это место для sweep в Task 17.

- [ ] **Step 4: Тесты + typecheck + Commit**

Тестам компонентов с `useTranslation` нужен i18n-провайдер — проверить, как настроен vitest setup (существующие тесты компонентов уже проходят с `react-i18next`; следовать той же схеме).

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test` → PASS.

```bash
git add frontend/src
git commit -m "feat(frontend): move enum labels to i18n dictionaries (ru/en)"
```

---

### Task 17: i18n — sweep по страницам и компонентам (часть пункта 4)

**Files:** все `*.tsx` c кириллицей вне `locales/` и тестов. Найти:

```bash
grep -rln "[А-Яа-яЁё]" frontend/src --include="*.tsx" --include="*.ts" | grep -v -e locales -e "\.test\."
```

**Конвенция ключей:** по фиче — `home.*`, `auth.*`, `vacancies.*`, `resumes.*`, `companies.*`, `applications.*`, `favorites.*`, `savedSearches.*`, `blocks.*`, `notificationsPage.*`, `subscription.*`, `profile.*`, `moderation.*`, `common.*` (кнопки «Найти», «Применить», «Сбросить», «Отмена», «Удалить», «Загрузка...», «Найдено: {{count}}»).

- [ ] **Step 1: Клиентские компоненты — прямая замена на t()**

Для каждого файла из grep-списка: добавить ключи в `ru/common.json` (перенос строки 1:1) и `en/common.json` (перевод), заменить литералы на `t('...')`. Плейсхолдеры/aria-label/`placeholder`-атрибуты — тоже. Интерполяция — `t('common.found', { count: store.total })` с `"found": "Найдено: {{count}}"`.

Порядок обработки (коммит после каждой группы):

1. Шапка/навигация/шаред: `WebHeader` (aria «Язык интерфейса»), `NotificationBadge` («Уведомления»), `components/shared/*` (EmptyState/ErrorState/PaginationBar defaults), `multi-select.tsx` («Сбросить»), `country-select`.
   Commit: `feat(frontend): i18n for header, shared components and selects`
2. Публичные страницы: `VacanciesClient`, `VacancyDetailClient`, `VacancyFilters` («Страна», «Отрасль», «Зарплата», «Применить»...), `CompaniesClient`, `CompanyDetailClient`, `CompanyFilters`, `ResumesClient`, `ResumeDetailClient`, карточки (VacancyCard, CompanyCard, ResumeCard), FavoriteButton, SaveSearchButton, ReportDialog, BlockButton, ApplyDialog.
   Commit: `feat(frontend): i18n for public catalog pages and cards`
3. Auth: `login/page.tsx`, `register/page.tsx` — страницы серверные; преобразовать заголовок/описание/футер в клиентский компонент ЛИБО перенести Card-контент в существующие клиентские `EmailLoginForm`-обёртки. Решение: создать `app/(auth)/login/LoginCard.tsx` и `app/(auth)/register/RegisterCard.tsx` (`'use client'`, `useTranslation`), page.tsx рендерит их.
   Commit: `feat(frontend): i18n for auth pages`
4. Dashboard: `MyVacanciesClient`, `MyResumesClient`, `MyCompaniesClient`, `MyApplicationsClient`, `VacancyApplicationsClient`, `MyFavoritesClient`, saved-searches, blocks, notifications, publications, `ProfileClient` (массив LINKS → ключи `profile.links.*`), analytics-страницы, Create/Edit-клиенты («Новая вакансия», «← Мои вакансии», тексты toast'ов).
   Commit: `feat(frontend): i18n for dashboard pages`
5. Формы + Zod: `VacancyForm`, `CompanyForm`, `ResumeForm`, `EmailLoginForm`, `EmailRegisterForm`. Zod-сообщения: схему строить в функции и мемоизировать:

```tsx
const buildSchema = (t: TFunction) =>
  z.object({
    title: z.string().min(1, t('forms.validation.required')),
    // ...
  })

// в компоненте:
const { t } = useTranslation()
const schema = useMemo(() => buildSchema(t), [t])
```

Commit: `feat(frontend): i18n for forms and zod validation messages` 6. Подписка: `SubscriptionClient`, `SubscriptionPlanCard` (включая VIP-фичи из Task 14), `PackageCard`, `StarsPrice` («Бесплатно»), `UpsellModal`, `LimitBar`, `SubscriptionBadge`.
Commit: `feat(frontend): i18n for subscription pages`

- [ ] **Step 2: После каждой группы**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS (тексты в тестах, завязанные на RU-строки, продолжат работать, т.к. ru — язык по умолчанию в тестовом i18n; если тест падает — проверить, что ключ добавлен в ru/common.json).

**Вне объёма:** `metadata`/SEO-строки в серверных `page.tsx` (title/description) остаются RU — локализация SEO-метаданных относится к Sprint 10; `docs/*` и backend-строки не трогаем.

---

### Task 18: i18n — главная страница (server component) (часть пункта 4)

**Files:**

- Create: `frontend/src/app/HomeContent.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Вынести разметку в клиентский компонент**

`page.tsx` остаётся серверным (данные + ISR):

```tsx
import { getLatestVacancies } from '@/lib/home-data'
import { HomeContent } from './HomeContent'

export const revalidate = 300

export default async function HomePage() {
  const latest = await getLatestVacancies(6)
  return <HomeContent latest={latest} />
}
```

`HomeContent.tsx` — `'use client'`, принимает `latest: Vacancy[]`, содержит текущий JSX из page.tsx (Hero с увеличенным логотипом из Task 6, «Как это работает», CTA) с заменой всех строк на `t('home.*')` (ключи: `home.heroTitle`, `home.heroSubtitle`, `home.findJob`, `home.postVacancy`, `home.latestVacancies`, `home.allVacancies`, `home.howItWorks`, `home.steps.profile.title/text`, `home.steps.match.title/text`, `home.steps.apply.title/text`, `home.ctaCandidate.title/text/button`, `home.ctaEmployer.title/text/button`). Добавить ключи в оба common.json (ru — 1:1 из текущего текста, en — перевод).

- [ ] **Step 2: Тесты + typecheck + Commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test` → PASS.

```bash
git add frontend/src/app/page.tsx frontend/src/app/HomeContent.tsx frontend/src/locales
git commit -m "feat(frontend): i18n for home page via client HomeContent"
```

---

### Task 19: i18n — верификация полноты (закрытие пункта 4)

- [ ] **Step 1: Grep-аудит кириллицы**

```bash
grep -rn "[А-Яа-яЁё]" frontend/src --include="*.tsx" --include="*.ts" | grep -v -e locales -e "\.test\." -e "// " | grep -v "metadata"
```

Expected: остаются только комментарии и `metadata`-блоки серверных страниц (SEO — RU, вне объёма). Любую другую находку — перевести (добавить ключ + t()).

- [ ] **Step 2: Ручная проверка EN**

Dev-сервер → переключить язык на EN (Globe) → пройти: главная, вакансии+фильтры, резюме, компании, подписка, dashboard, профиль, формы (включая сообщения валидации). Всё должно быть на английском.

- [ ] **Step 3: Commit остаточных правок**

```bash
git add frontend/src
git commit -m "fix(frontend): finish i18n sweep, translate remaining strings"
```

---

### Task 20: Финальная верификация и закрытие

- [ ] **Step 1: Полный прогон**

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend test
pnpm --filter frontend lint
```

Expected: 0 ошибок TS, все тесты зелёные, lint чистый.

- [ ] **Step 2: Сверка с чеклистом требований**

Открыть `docs/ui-ux-features.md`, пройти по всем 18 пунктам, для каждого убедиться в браузере (RU и EN), что поведение соответствует. Не забыть закоммитить обновлённые `frontend/public/logo-horizontal.png` и `logo-vertical.png` (уже изменены в рабочем дереве):

```bash
git add frontend/public/logo-horizontal.png frontend/public/logo-vertical.png
git commit -m "feat(frontend): update logo assets"
```

- [ ] **Step 3: Завершение ветки**

Использовать skill `superpowers:finishing-a-development-branch` (merge в main / PR — по выбору пользователя).
