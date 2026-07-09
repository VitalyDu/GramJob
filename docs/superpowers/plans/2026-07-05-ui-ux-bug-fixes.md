# UI/UX Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить 15 UI/UX-багов из `docs/ui-ux-bugs.md` (краши, мобильный адаптив, layout, косметика/тексты).

**Architecture:** Только правки существующих компонентов Next.js 15 (frontend) + один точечный фикс в backend-сервисе уведомлений. Изменения сгруппированы в 4 тематических коммита: критические баги → адаптив → layout → косметика/тексты. TDD там, где есть проверяемое поведение (краш при `company=null`, strip эмодзи, цвета бейджей); чистые Tailwind-правки проверяются существующими тестами + typecheck.

**Tech Stack:** Next.js 15, React 19, TypeScript strict (`exactOptionalPropertyTypes`), TailwindCSS 4, Radix UI (Select), vitest + @testing-library/react (frontend), jest (backend, `backend/tests/unit/`).

**Решения по спорным пунктам (согласованы с пользователем):**

- Баг №3 (фильтры в левой колонке, поиск над списком) — **уже реализован в main** (`VacanciesClient.tsx`, `CompaniesClient.tsx`, `ResumesClient.tsx` используют `md:grid md:grid-cols-[280px_1fr]`). Задачи нет; пользователь видел старую сборку на 138.226.237.70 — нужен редеплой. На мобильных фильтры остаются как есть (решение пользователя).
- №12 «план» → «тариф»: везде в RU-локали со склонениями, EN не трогаем.
- Коммиты: 4 тематических.

**Как запускать проверки:**

```bash
cd /Users/vitaly/work/GramJob/frontend && pnpm typecheck   # tsc --noEmit
cd /Users/vitaly/work/GramJob/frontend && pnpm test        # vitest run
cd /Users/vitaly/work/GramJob/backend && pnpm test         # jest
```

---

## Коммит 1 — критические баги (№10, №6, №5)

### Task 1: №10 — краш `Cannot read properties of null (reading 'logo')`

Backend может вернуть вакансию с `company = null` (например, external-вакансии). Тип `Vacancy.company` объявлен non-nullable, поэтому TS не ловил обращение `v.company.logo` без guard.

**Files:**

- Modify: `frontend/src/types/api.ts:215`
- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx:73-101`
- Test: `frontend/src/app/vacancies/[id]/VacancyDetailClient.test.tsx`

- [ ] **Step 1: Написать падающий тест**

В `VacancyDetailClient.test.tsx` добавить в конец `describe('VacancyDetailClient', ...)`:

```tsx
it('рендерится без падения, если company=null', () => {
  const noCompanyVacancy = { ...mockVacancy, company: null }
  vi.mocked(useStores).mockReturnValue(makeUseStoresReturn({ currentVacancy: noCompanyVacancy }))

  render(<VacancyDetailClient id="vac123" />)

  expect(screen.getByText('Senior Frontend Developer')).toBeDefined()
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd frontend && pnpm test -- VacancyDetailClient`
Expected: FAIL — `Cannot read properties of null (reading 'logo')`

- [ ] **Step 3: Исправить тип и компонент**

`frontend/src/types/api.ts:215` — было `company: VacancyCompanyRef`, стало:

```ts
company: VacancyCompanyRef | null
```

`VacancyDetailClient.tsx:73` — было `const logoUrl = v.company.logo ? getMediaUrl(v.company.logo.url) : null`, стало:

```ts
const logoUrl = getMediaUrl(v.company?.logo?.url)
```

(`getMediaUrl` принимает `string | null | undefined` — см. `lib/media.ts:6`.)

Блок лого (строки 82–88) — обернуть в guard по company:

```tsx
{
  logoUrl && v.company && (
    <img
      src={logoUrl}
      alt={v.company.name}
      className="h-14 w-14 shrink-0 rounded-lg object-cover"
    />
  )
}
```

Ссылка на компанию (строки 94–101) уже под guard `{v.company && (...)}` — не трогать.

- [ ] **Step 4: Прогнать typecheck — он должен показать оставшиеся небезопасные обращения**

Run: `cd frontend && pnpm typecheck`
Expected: 0 ошибок. Если tsc укажет другие файлы с обращением к `company` без guard — добавить `?.` там же (известные потребители `Vacancy.company`: `VacancyCard.tsx` и `MyVacanciesClient.tsx` уже используют `?.`; `ApplicationCard.tsx`/`ApplicationDetailClient.tsx` используют отдельный тип `ApplicationVacancyRef` — их не трогать).

- [ ] **Step 5: Прогнать тест**

Run: `cd frontend && pnpm test -- VacancyDetailClient`
Expected: PASS (все тесты файла)

### Task 2: №6 — дропдаун Select перестаёт скроллиться на мобильных

Radix Select в режиме `position="item-aligned"` (текущий дефолт в `select.tsx:50`) после первого скролла растягивает дропдаун на высоту всего контента и ломает скролл. Канонический фикс — режим `popper`. Заодно исправить скопированный с ошибкой класс viewport: `--radix-select-trigger-height` (высота триггера ~36px) → `--radix-select-content-available-height`.

**Files:**

- Modify: `frontend/src/components/ui/select.tsx:50,72-73`

- [ ] **Step 1: Сменить дефолтную позицию**

`select.tsx:50` — было `position = 'item-aligned',`, стало:

```tsx
  position = 'popper',
```

- [ ] **Step 2: Исправить высоту viewport в popper-режиме**

`select.tsx:72-73` — было:

```tsx
position === 'popper' &&
  'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1'
```

стало:

```tsx
position === 'popper' &&
  'max-h-[var(--radix-select-content-available-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1'
```

- [ ] **Step 3: Прогнать тесты и typecheck**

Run: `cd frontend && pnpm test && pnpm typecheck`
Expected: PASS, 0 ошибок (селекты используются в VacancyFilters.test и формах — поведенчески ничего не меняется в jsdom)

- [ ] **Step 4: Ручная проверка в браузере**

Запустить `pnpm dev`, открыть `/dashboard/resumes/new` в Chrome DevTools mobile-эмуляции, открыть селект «Валюта», проскроллить дропдаун дважды. Expected: скролл работает, дропдаун не растягивается на весь экран. Финальная проверка на реальном iPhone — за пользователем.

### Task 3: №5 — нижний navbar не прижат к низу на iPhone при скрытии адресной строки

`100vh` (`min-h-screen`) на iOS Safari не пересчитывается при скрытии тулбара. Фикс — динамические viewport-единицы (`dvh`), поддерживаются Tailwind 4 из коробки.

**Files:**

- Modify: `frontend/src/components/layout/AppShell.tsx:15`

- [ ] **Step 1: Заменить min-h-screen на min-h-dvh**

`AppShell.tsx:15` — было `<div className="flex min-h-screen flex-col">`, стало:

```tsx
    <div className="flex min-h-dvh flex-col">
```

(BottomNav — `fixed bottom-0` + `pb-[env(safe-area-inset-bottom)]`, его не трогаем.)

- [ ] **Step 2: Прогнать тесты и typecheck**

Run: `cd frontend && pnpm test && pnpm typecheck`
Expected: PASS. Финальная проверка на реальном iPhone — за пользователем (пункт QA-чеклиста).

### Task 4: Коммит 1

- [ ] **Step 1: Закоммитить**

```bash
git add frontend/src/types/api.ts "frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx" "frontend/src/app/vacancies/[id]/VacancyDetailClient.test.tsx" frontend/src/components/ui/select.tsx frontend/src/components/layout/AppShell.tsx
git commit -m "fix(frontend): null company crash, mobile select scroll, iOS bottom nav pinning"
```

---

## Коммит 2 — мобильный адаптив (№7, №8, №9, №14, №16)

### Task 5: №7 — адаптив карточек «Мои компании»

Сейчас карточка — один ряд `flex items-center gap-4` (лого + инфо + кнопки), на мобильных кнопки сжимают контент. Делаем: лого+инфо в ряд, кнопки переносятся на новую строку на узких экранах.

**Files:**

- Modify: `frontend/src/app/dashboard/companies/MyCompaniesClient.tsx:88-145`

- [ ] **Step 1: Перестроить layout карточки**

Заменить строку 88 `<div className="flex items-center gap-4">` и структуру до закрывающего тега блока кнопок (строка 145) на:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
  <div className="flex min-w-0 flex-1 items-center gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={company.name}
          width={48}
          height={48}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-lg font-bold text-muted-foreground">
          {company.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate font-semibold text-card-foreground">{company.name}</p>
        <StatusBadge status={company.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {company.country} · {COMPANY_SIZE_LABELS[company.companySize]}
      </p>
    </div>
  </div>

  <div className="flex flex-wrap gap-2 sm:shrink-0">
    {/* содержимое блока кнопок (Edit / toModeration / delete) без изменений */}
  </div>
</div>
```

Содержимое блока кнопок (Link «Edit», Button «toModeration», Button «delete», строки 116–144) переносится как есть — меняется только класс обёртки: `flex shrink-0 gap-2` → `flex flex-wrap gap-2 sm:shrink-0`.

- [ ] **Step 2: Прогнать тесты**

Run: `cd frontend && pnpm test -- MyCompaniesClient && pnpm typecheck`
Expected: PASS (тесты проверяют поведение, не классы)

### Task 6: №8 — адаптив карточек «Мои вакансии»

**Files:**

- Modify: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx:108,120,172`

- [ ] **Step 1: Перестроить ряды карточки**

Строка 108 — было `<div className="flex items-start justify-between gap-4">`, стало:

```tsx
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
```

Строка 120 — было `<div className="flex shrink-0 flex-wrap gap-2">`, стало:

```tsx
              <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
```

Строка 172 (ряд счётчиков) — было `<div className="mt-2 flex gap-4 text-xs text-muted-foreground">`, стало:

```tsx
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
```

- [ ] **Step 2: Прогнать тесты**

Run: `cd frontend && pnpm test -- MyVacanciesClient && pnpm typecheck`
Expected: PASS

### Task 7: №9 — адаптив карточек «Мои резюме»

**Files:**

- Modify: `frontend/src/app/dashboard/resumes/MyResumesClient.tsx:92,104,143`

- [ ] **Step 1: Перестроить ряды карточки (тот же паттерн, что в Task 6)**

Строка 92 — было `<div className="flex items-start justify-between gap-4">`, стало:

```tsx
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
```

Строка 104 — было `<div className="flex shrink-0 flex-wrap gap-2">`, стало:

```tsx
              <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
```

Строка 143 — было `<div className="mt-2 flex gap-4 text-xs text-muted-foreground">`, стало:

```tsx
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
```

- [ ] **Step 2: Прогнать тесты**

Run: `cd frontend && pnpm test && pnpm typecheck`
Expected: PASS

### Task 8: №16 + №14 — все формы: одна колонка на мобильных

Все жёсткие `grid-cols-2` / `grid-cols-3` в формах становятся `grid-cols-1 sm:grid-cols-2` / `grid-cols-1 sm:grid-cols-3`. Это же закрывает №14: ряды `<Input type="date">` в карточках опыта/образования ResumeForm — именно они ломают адаптив (у нативных date-инпутов большая intrinsic-ширина). Дополнительно date-инпутам даём `min-w-0`.

**Files:**

- Modify: `frontend/src/components/resume/ResumeForm.tsx:257,274,312,359,460,480,483,487-491,568,584,587,591,617`
- Modify: `frontend/src/components/company/CompanyForm.tsx:150,177`
- Modify: `frontend/src/components/vacancy/VacancyForm.tsx:381,405,520`

- [ ] **Step 1: ResumeForm — заменить классы сеток**

Точечные замены (`grid grid-cols-2 gap-4` → `grid grid-cols-1 gap-4 sm:grid-cols-2` и аналогично):

| Строка | Было                     | Стало                                   |
| ------ | ------------------------ | --------------------------------------- |
| 257    | `grid grid-cols-2 gap-4` | `grid grid-cols-1 gap-4 sm:grid-cols-2` |
| 274    | `grid grid-cols-2 gap-4` | `grid grid-cols-1 gap-4 sm:grid-cols-2` |
| 312    | `grid grid-cols-2 gap-4` | `grid grid-cols-1 gap-4 sm:grid-cols-2` |
| 359    | `grid grid-cols-3 gap-4` | `grid grid-cols-1 gap-4 sm:grid-cols-3` |
| 460    | `grid grid-cols-2 gap-3` | `grid grid-cols-1 gap-3 sm:grid-cols-2` |
| 480    | `grid grid-cols-2 gap-3` | `grid grid-cols-1 gap-3 sm:grid-cols-2` |
| 568    | `grid grid-cols-2 gap-3` | `grid grid-cols-1 gap-3 sm:grid-cols-2` |
| 584    | `grid grid-cols-2 gap-3` | `grid grid-cols-1 gap-3 sm:grid-cols-2` |
| 617    | `grid grid-cols-3 gap-4` | `grid grid-cols-1 gap-4 sm:grid-cols-3` |

- [ ] **Step 2: ResumeForm — min-w-0 для date-инпутов (№14)**

Четыре `<Input type="date" ...>` (строки 483, 487–491 опыт; 587, 591 образование) получают `className="min-w-0"`, например:

```tsx
<Input type="date" className="min-w-0" {...register(`workExperience.${index}.startDate`)} />
```

и для endDate опыта:

```tsx
<Input
  type="date"
  className="min-w-0"
  {...register(`workExperience.${index}.endDate`)}
  disabled={watchWorkExperience[index]?.current}
/>
```

(аналогично двум date-инпутам образования на строках 587 и 591).

- [ ] **Step 3: CompanyForm — заменить классы сеток**

Строки 150 и 177: `grid grid-cols-2 gap-4` → `grid grid-cols-1 gap-4 sm:grid-cols-2`.

- [ ] **Step 4: VacancyForm — заменить классы сеток**

| Строка | Было                     | Стало                                   |
| ------ | ------------------------ | --------------------------------------- |
| 381    | `grid grid-cols-2 gap-4` | `grid grid-cols-1 gap-4 sm:grid-cols-2` |
| 405    | `grid grid-cols-3 gap-4` | `grid grid-cols-1 gap-4 sm:grid-cols-3` |
| 520    | `grid grid-cols-2 gap-4` | `grid grid-cols-1 gap-4 sm:grid-cols-2` |

(строка 315 уже responsive — не трогать).

- [ ] **Step 5: Контрольный grep — не осталось жёстких мультиколоночных сеток в формах**

Run: `grep -rn "grid-cols-[23]" frontend/src/components/resume frontend/src/components/company frontend/src/components/vacancy frontend/src/components/application | grep -v "sm:grid-cols\|md:grid-cols\|lg:grid-cols" | grep -v test`
Expected: пустой вывод

- [ ] **Step 6: Прогнать тесты**

Run: `cd frontend && pnpm test && pnpm typecheck`
Expected: PASS

### Task 9: Коммит 2

- [ ] **Step 1: Ручная проверка в браузере**

`pnpm dev`, DevTools mobile-эмуляция (375px): `/dashboard/companies`, `/dashboard/vacancies`, `/dashboard/resumes` (карточки не сжаты, кнопки переносятся), `/dashboard/resumes/new` (все поля в одну колонку, даты не вылезают).

- [ ] **Step 2: Закоммитить**

```bash
git add frontend/src/app/dashboard/companies/MyCompaniesClient.tsx frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx frontend/src/app/dashboard/resumes/MyResumesClient.tsx frontend/src/components/resume/ResumeForm.tsx frontend/src/components/company/CompanyForm.tsx frontend/src/components/vacancy/VacancyForm.tsx
git commit -m "fix(frontend): mobile responsiveness for dashboard cards and all forms"
```

---

## Коммит 3 — layout (№2, №4)

### Task 10: №2 — убрать min-h-screen на логине/регистрации

**Files:**

- Modify: `frontend/src/app/(auth)/login/page.tsx:5`
- Modify: `frontend/src/app/(auth)/register/page.tsx:5`

- [ ] **Step 1: Убрать класс в обоих файлах**

В обоих файлах строка 5 — было `<div className="flex min-h-screen justify-center p-4 pt-12 sm:pt-16">`, стало:

```tsx
    <div className="flex justify-center p-4 pt-12 sm:pt-16">
```

- [ ] **Step 2: Прогнать тесты**

Run: `cd frontend && pnpm test && pnpm typecheck`
Expected: PASS

### Task 11: №4 — заголовок «Создать резюме» под кнопкой Back

Страницы вакансий/компаний используют `space-y-1` (Back сверху, заголовок под ним); страницы резюме — `flex items-center gap-3` (в одну строку). Выравниваем по образцу.

**Files:**

- Modify: `frontend/src/app/dashboard/resumes/new/CreateResumeClient.tsx:36-44`
- Modify: `frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx:66` (аналогичный блок)

- [ ] **Step 1: CreateResumeClient — перестроить шапку**

Было (строки 36–44):

```tsx
<div className="flex items-center gap-3">
  <Link href="/dashboard/resumes" className="text-sm text-muted-foreground hover:text-foreground">
    {t('dashboard.resumes.backToList')}
  </Link>
  <h1 className="text-2xl font-bold">{t('dashboard.resumes.newTitle')}</h1>
</div>
```

Стало:

```tsx
<div className="space-y-1">
  <Link
    href="/dashboard/resumes"
    className="inline-block text-sm text-muted-foreground hover:text-foreground"
  >
    {t('dashboard.resumes.backToList')}
  </Link>
  <h1 className="text-2xl font-bold">{t('dashboard.resumes.newTitle')}</h1>
</div>
```

- [ ] **Step 2: EditResumeClient — та же замена**

В `EditResumeClient.tsx` (блок на строке 66) применить идентичную замену: `flex items-center gap-3` → `space-y-1`, ссылке добавить `inline-block` (там ключ заголовка — `dashboard.resumes.editTitle`, href тот же).

- [ ] **Step 3: Прогнать тесты**

Run: `cd frontend && pnpm test && pnpm typecheck`
Expected: PASS

### Task 12: Коммит 3

- [ ] **Step 1: Закоммитить**

```bash
git add "frontend/src/app/(auth)/login/page.tsx" "frontend/src/app/(auth)/register/page.tsx" frontend/src/app/dashboard/resumes/new/CreateResumeClient.tsx "frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx"
git commit -m "fix(frontend): auth page height and resume form header layout"
```

---

## Коммит 4 — косметика и тексты (№1, №11, №12, №13, №15)

### Task 13: №1 — убрать ring у активного плана на /subscription

**Files:**

- Modify: `frontend/src/app/subscription/SubscriptionClient.tsx:190-205`

- [ ] **Step 1: Убрать обёртку с ring-классами**

Было (строки 190–205):

```tsx
{
  orderedPlans.map((plan) => {
    const currentPlan = user?.subscriptionPlan ?? 'free'
    return (
      <div
        key={plan.code}
        className={plan.code === currentPlan ? 'ring-2 ring-primary rounded-xl' : ''}
      >
        <SubscriptionPlanCard
          plan={plan}
          currentPlan={currentPlan}
          canBuy={canUpgradeToPlan(currentPlan, plan.code)}
          isBuying={buyingPlan === plan.code}
          onBuy={handleBuyPlan}
        />
      </div>
    )
  })
}
```

Стало:

```tsx
{
  orderedPlans.map((plan) => {
    const currentPlan = user?.subscriptionPlan ?? 'free'
    return (
      <SubscriptionPlanCard
        key={plan.code}
        plan={plan}
        currentPlan={currentPlan}
        canBuy={canUpgradeToPlan(currentPlan, plan.code)}
        isBuying={buyingPlan === plan.code}
        onBuy={handleBuyPlan}
      />
    )
  })
}
```

- [ ] **Step 2: Прогнать тесты**

Run: `cd frontend && pnpm test && pnpm typecheck`
Expected: PASS

### Task 14: №11 — единый стиль иконок уведомлений

Сейчас: слева на карточке — эмодзи из `TYPE_ICONS`, а в тексте (`body`) — ещё одно эмодзи, потому что backend сохраняет в БД тот же текст, что шлёт в Telegram (`telegram-bot.ts:177-192`). Делаем: (а) на карточке — lucide-иконка в круглом контейнере; (б) backend при сохранении в БД срезает ведущее эмодзи; (в) frontend тоже срезает при отображении — для уже существующих записей в БД.

**Files:**

- Create: `frontend/src/lib/notification-utils.ts`
- Create: `frontend/src/lib/notification-utils.test.ts`
- Modify: `frontend/src/app/dashboard/notifications/NotificationsClient.tsx` (TYPE_ICONS и рендер карточки)
- Modify: `backend/src/services/notification.service.ts:94`
- Test: `backend/tests/unit/notification-service.test.ts`

- [ ] **Step 1: Написать падающий тест strip-функции (frontend)**

Создать `frontend/src/lib/notification-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { stripLeadingEmoji } from './notification-utils'

describe('stripLeadingEmoji', () => {
  it('срезает ведущее эмодзи и пробел', () => {
    expect(stripLeadingEmoji('📩 Новый отклик на «X»')).toBe('Новый отклик на «X»')
  })

  it('срезает эмодзи с variation selector', () => {
    expect(stripLeadingEmoji('⚠️ Ваша подписка Pro истекает')).toBe('Ваша подписка Pro истекает')
  })

  it('не трогает текст без эмодзи', () => {
    expect(stripLeadingEmoji('Обычный текст')).toBe('Обычный текст')
  })

  it('не трогает эмодзи в середине текста', () => {
    expect(stripLeadingEmoji('Текст с 🔥 внутри')).toBe('Текст с 🔥 внутри')
  })
})
```

Run: `cd frontend && pnpm test -- notification-utils`
Expected: FAIL — модуль не существует

- [ ] **Step 2: Реализовать notification-utils.ts (frontend)**

Создать `frontend/src/lib/notification-utils.ts`:

```ts
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Gift,
  Mail,
  Megaphone,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { NotificationType } from '@/types/api'

export const NOTIFICATION_TYPE_ICONS: Partial<Record<NotificationType, LucideIcon>> = {
  new_application: Mail,
  application_approved: CheckCircle2,
  application_rejected: XCircle,
  interview_invitation: Calendar,
  test_task: FileText,
  offer_received: Gift,
  resume_viewed: Eye,
  vacancy_viewed: Eye,
  vacancy_expiring_soon: Clock,
  vacancy_expired: AlertCircle,
  subscription_expiring: AlertTriangle,
  subscription_expired: AlertCircle,
  limits_reached: Ban,
  saved_search_match: Bell,
  moderation_approved: CheckCircle2,
  moderation_rejected: XCircle,
}

export const DEFAULT_NOTIFICATION_ICON: LucideIcon = Megaphone

export function stripLeadingEmoji(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}️‍]+\s*/u, '')
}
```

Run: `cd frontend && pnpm test -- notification-utils`
Expected: PASS

- [ ] **Step 3: Переделать карточку уведомления**

В `NotificationsClient.tsx`:

1. Удалить локальную константу `TYPE_ICONS` (блок с эмодзи в начале файла) и импорт `NotificationType` (если больше не используется).
2. Добавить импорт:

```ts
import {
  NOTIFICATION_TYPE_ICONS,
  DEFAULT_NOTIFICATION_ICON,
  stripLeadingEmoji,
} from '@/lib/notification-utils'
```

3. В рендере карточки заменить блок иконки и body. Было:

```tsx
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xl" aria-hidden>
                      {TYPE_ICONS[n.type] ?? '📢'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-card-foreground">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
```

Стало (внутри `.map((n) => ...)` перед `return` карточки объявить `const Icon = NOTIFICATION_TYPE_ICONS[n.type] ?? DEFAULT_NOTIFICATION_ICON` — для этого стрелочное тело `map` должно иметь фигурные скобки с явным `return`):

```tsx
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      aria-hidden
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-card-foreground">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {stripLeadingEmoji(n.body)}
                      </p>
```

- [ ] **Step 4: Написать падающий backend-тест на чистый body**

В `backend/tests/unit/notification-service.test.ts` добавить (стиль импортов взять из существующих тестов файла):

```ts
import { stripLeadingEmoji } from '../../src/services/notification.service'

describe('stripLeadingEmoji', () => {
  it('срезает ведущее эмодзи из текста уведомления', () => {
    expect(stripLeadingEmoji('📩 Новый отклик на «X» от Ивана')).toBe(
      'Новый отклик на «X» от Ивана'
    )
  })

  it('не трогает текст без эмодзи', () => {
    expect(stripLeadingEmoji('Обычный текст')).toBe('Обычный текст')
  })
})
```

Run: `cd backend && pnpm test -- notification-service`
Expected: FAIL — `stripLeadingEmoji` не экспортируется

- [ ] **Step 5: Реализовать strip на backend**

В `backend/src/services/notification.service.ts` добавить экспорт (рядом с `buildNotificationTitle`):

```ts
export function stripLeadingEmoji(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}️‍]+\s*/u, '')
}
```

И в `sendNotification` строка 94 — было `body: message.text,`, стало:

```ts
        body: stripLeadingEmoji(message.text),
```

(В Telegram (`sendMessage`, строка 114) по-прежнему уходит `message` с эмодзи — там они уместны.)

Run: `cd backend && pnpm test -- notification-service`
Expected: PASS

- [ ] **Step 6: Полный прогон**

Run: `cd frontend && pnpm test && pnpm typecheck && cd ../backend && pnpm test && pnpm typecheck`
Expected: PASS, 0 ошибок

### Task 15: №12 — «план» → «тариф» в RU-локали

**Files:**

- Modify: `frontend/src/locales/ru/common.json` (11 строк)

- [ ] **Step 1: Выполнить замены**

Точечные правки значений (ключи не трогать!):

| Строка | Было                                                                                 | Стало                                                                                            |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 130    | `"Дневной лимит откликов исчерпан. Обновите план для большего количества откликов."` | `"Дневной лимит откликов исчерпан. Обновите тариф для большего количества откликов."`            |
| 328    | `"desc": "План, лимиты и пакеты"`                                                    | `"desc": "Тариф, лимиты и пакеты"`                                                               |
| 358    | `"applyLimitDesc": "Лимит откликов в день (план {{plan}}): {{limit}}"`               | `"applyLimitDesc": "Лимит откликов в день (тариф {{plan}}): {{limit}}"`                          |
| 634    | `"currentPlan": "Ваш текущий план"`                                                  | `"currentPlan": "Ваш текущий тариф"`                                                             |
| 637    | `"loginPrompt": "Войдите, чтобы управлять подпиской и покупать планы."`              | `"loginPrompt": "Войдите, чтобы управлять подпиской и покупать тарифы."`                         |
| 641    | `"plansTitle": "Планы подписки"`                                                     | `"plansTitle": "Тарифы подписки"`                                                                |
| 642    | `"loadingPlans": "Загрузка планов..."`                                               | `"loadingPlans": "Загрузка тарифов..."`                                                          |
| 644    | `"vacancyPacksDesc": "...Не сгорают при смене плана."`                               | `"vacancyPacksDesc": "...Не сгорают при смене тарифа."` (остальной текст строки без изменений)   |
| 665    | `"requiresMax": "Требует активный план Max"`                                         | `"requiresMax": "Требует активный тариф Max"`                                                    |
| 685    | `"body": "Вы использовали все вакансии по текущему плану. ..."`                      | `"body": "Вы использовали все вакансии по текущему тарифу. ..."` (остальной текст без изменений) |
| 688    | `"upgrade": "Улучшить план"`                                                         | `"upgrade": "Улучшить тариф"`                                                                    |

- [ ] **Step 2: Контрольный grep — слова «план» в RU-значениях не осталось**

Run: `grep -n "план\|План\|плану\|плана\|планы\|планов" frontend/src/locales/ru/common.json`
Expected: пустой вывод. Также проверить компоненты: `grep -rn "план" frontend/src --include="*.tsx" | grep -v test` — Expected: пусто (все строки давно в i18n).

- [ ] **Step 3: Прогнать тесты**

Run: `cd frontend && pnpm test`
Expected: PASS. Если какой-то тест ассертит старый текст («Улучшить план» и т.п.) — обновить ожидание в тесте на новый текст.

### Task 16: №13 — зелёный бейдж бесплатного тарифа

**Files:**

- Modify: `frontend/src/lib/subscription-utils.ts:11,35`
- Test: `frontend/src/lib/subscription-utils.test.ts:20-21,73` (и связанная проверка классов)

- [ ] **Step 1: Обновить тест (падающий)**

В `subscription-utils.test.ts`: тест `'free — серый'` (строки 20–21) переименовать и поменять ожидание:

```ts
it('free — зелёный', () => {
  expect(PLAN_COLORS.free).toBe('green')
})
```

Тест `'free — серые классы'` (строка 73) — обновить на:

```ts
it('free — зелёные классы', () => {
  expect(getPlanBadgeClasses('free')).toBe('bg-green-100 text-green-700')
})
```

(если внутри теста другой ассерт-стиль — сохранить его, поменяв только ожидаемые значения). Также найти в этом файле fallback-тест неизвестного плана (`getPlanBadgeClasses('unknown')` возвращает классы free) и обновить ожидание на зелёные классы.

Run: `cd frontend && pnpm test -- subscription-utils`
Expected: FAIL

- [ ] **Step 2: Реализовать**

`subscription-utils.ts:11` — было `free: 'gray',`, стало:

```ts
  free: 'green',
```

`subscription-utils.ts:35` — было `free: 'bg-gray-100 text-gray-700',`, стало:

```ts
  free: 'bg-green-100 text-green-700',
```

Run: `cd frontend && pnpm test -- subscription-utils`
Expected: PASS

### Task 17: №15 — «Место работы N» → поле «Название компании»

В карточке записи опыта работы убираем нумерованный заголовок «Место работы N» (шапка остаётся только с кнопкой удаления), а лейбл поля `company` переименовываем в «Название компании» / «Company name». Записи образования («Образование N») не трогаем — баг касается только опыта работы.

**Files:**

- Modify: `frontend/src/components/resume/ResumeForm.tsx:443-457`
- Modify: `frontend/src/locales/ru/common.json:609,611`
- Modify: `frontend/src/locales/en/common.json:579,581`

- [ ] **Step 1: Переименовать лейблы в локалях**

`ru/common.json:611` (внутри `forms.resume`) — было `"companyLabel": "Компания",`, стало:

```json
      "companyLabel": "Название компании",
```

`en/common.json:581` — было `"companyLabel": "Company",`, стало:

```json
      "companyLabel": "Company name",
```

(Внимание: в файле два ключа `companyLabel` — на строках ~523/493 это `forms.vacancy`, его не трогать; менять только в секции `forms.resume`.)

- [ ] **Step 2: Убрать заголовок «Место работы N» из карточки записи**

`ResumeForm.tsx` строки 443–457 — было:

```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="text-sm">{t('forms.resume.workExpEntry', { num: index + 1 })}</CardTitle>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => removeWork(index)}
      aria-label={t('forms.resume.removeEntry')}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  </div>
</CardHeader>
```

Стало:

```tsx
<CardHeader>
  <div className="flex items-center justify-end">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => removeWork(index)}
      aria-label={t('forms.resume.removeEntry')}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  </div>
</CardHeader>
```

- [ ] **Step 3: Удалить осиротевший ключ локали**

Удалить строку `"workExpEntry": "Место работы {{num}}",` из `ru/common.json:609` и `"workExpEntry": "Work experience {{num}}",` из `en/common.json:579` (ключ больше нигде не используется; проверить: `grep -rn "workExpEntry" frontend/src --include="*.tsx" --include="*.ts"` — Expected: пусто после правки формы).

- [ ] **Step 4: Прогнать тесты**

Run: `cd frontend && pnpm test && pnpm typecheck`
Expected: PASS

### Task 18: Коммит 4 и финальная проверка

- [ ] **Step 1: Полный прогон обоих пакетов**

Run: `cd frontend && pnpm test && pnpm typecheck && cd ../backend && pnpm test && pnpm typecheck`
Expected: все тесты PASS (frontend было 310 + новые), 0 ошибок TS

- [ ] **Step 2: Ручная проверка в браузере**

`pnpm dev`: `/subscription` (нет ring, «Тарифы подписки», Free — зелёный бейдж), `/dashboard/notifications` (lucide-иконки, нет эмодзи в тексте), `/dashboard/resumes/new` (нет «Место работы N», поле «Название компании»), `/login` (карточка не растянута по высоте).

- [ ] **Step 3: Закоммитить**

```bash
git add frontend/src/app/subscription/SubscriptionClient.tsx frontend/src/lib/notification-utils.ts frontend/src/lib/notification-utils.test.ts frontend/src/app/dashboard/notifications/NotificationsClient.tsx backend/src/services/notification.service.ts backend/tests/unit/notification-service.test.ts frontend/src/locales/ru/common.json frontend/src/locales/en/common.json frontend/src/lib/subscription-utils.ts frontend/src/lib/subscription-utils.test.ts frontend/src/components/resume/ResumeForm.tsx
git commit -m "fix(frontend): subscription page polish, unified notification icons, plan->tariff wording, resume form labels"
```

---

## Вне плана (для пользователя)

- **№3** — код уже в main; после деплоя проверить на 138.226.237.70.
- **№5, №6** — фиксы канонические (dvh, Radix popper), но финальная проверка возможна только на реальном iPhone.
