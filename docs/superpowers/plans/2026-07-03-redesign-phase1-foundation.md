# UI/UX Redesign — Phase 1: Foundation (дизайн-система, layout, навигация) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заложить фундамент редизайна: фирменная тема по цветам логотипа, полный набор shadcn/ui-компонентов, единый контейнер, редизайн WebHeader с логотипом и мобильная нижняя навигация (web + Mini App).

**Architecture:** Тема задаётся только через CSS-переменные shadcn в `globals.css` (страницы автоматически получают брендовые цвета через семантические токены — они уже используются после Sprint 9). Единый контейнер живёт в `AppShell` (одно место — одно правило). `MiniAppBottomNav` обобщается в `BottomNav`: на мобильном вебе показывается через `md:hidden`, в Mini App — всегда. shadcn-компоненты добавляются через CLI в `components/ui/`.

**Tech Stack:** Next.js 15 App Router, React 19, TailwindCSS 4 (`@theme inline`), shadcn/ui (new-york, CLI `shadcn@latest`), lucide-react, i18next, Vitest + Testing Library.

**Спека:** `docs/ui-ux-redesign.md` §2 (shadcn/ui), §3 (адаптивность), §4 (единый контейнер), §5 (bottom navigation), §12–13.

**Конвенции проекта (обязательны):**

- Коммиты **без** `Co-Authored-By`.
- `exactOptionalPropertyTypes: true` — опциональные поля через conditional spread.
- Frontend-тесты: Vitest + `@testing-library/react`, описания на русском, setup `frontend/src/test/setup.ts` (реальный i18n). Тесты колокально: `Component.test.tsx` рядом с компонентом.
- Команды из корня репо: `pnpm -C frontend test`, `pnpm -C frontend typecheck`.

---

## Контекст: что есть сейчас (проверено 2026-07-03)

| Что                                                                                                   | Где                                                   | Статус                                                                          |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| shadcn-токены в `globals.css` — **нейтрально-серые** (oklch без chroma)                               | `frontend/src/app/globals.css`                        | заменить на бренд                                                               |
| shadcn-компоненты: только `button`, `input`, `label`; `components.json` **нет**                       | `frontend/src/components/ui/`                         | добавить ~18 компонентов                                                        |
| Контейнер: `container mx-auto px-4 py-6` в AppShell + разнобой `max-w-4xl/3xl/2xl/5xl` внутри страниц | `frontend/src/components/layout/AppShell.tsx`         | единый `max-w-6xl` в shell (страницы чистятся в Phase 3)                        |
| Bottom nav — только в Mini App, пункт «Профиль» вместо «Кабинет»                                      | `frontend/src/components/layout/MiniAppBottomNav.tsx` | переработать в `BottomNav`                                                      |
| WebHeader — текстовый логотип, нет ссылок Резюме/Компании, нет user-меню                              | `frontend/src/components/layout/WebHeader.tsx`        | редизайн                                                                        |
| Логотипы лежат в корне репо                                                                           | `logo-horizontal.png`, `logo-vertical.png`            | перенести в `frontend/public/`                                                  |
| `/dashboard` — 404 (страницы нет)                                                                     | —                                                     | «Кабинет» создаётся в Phase 4; ссылки на `/dashboard` уже валидны после Phase 4 |

**Фирменные цвета из логотипа:** голубой градиент (Telegram-blue → синий), тёмно-синий текст, оранжевый акцент (звезда/фигуры), слоган «Find opportunities. Build futures.»

---

### Task 1: Перенести логотипы в frontend/public

**Files:**

- Move: `logo-horizontal.png` → `frontend/public/logo-horizontal.png`
- Move: `logo-vertical.png` → `frontend/public/logo-vertical.png`

- [ ] **Step 1: Переместить файлы**

```bash
git mv logo-horizontal.png frontend/public/logo-horizontal.png
git mv logo-vertical.png frontend/public/logo-vertical.png
```

(Файлы untracked — если `git mv` откажет, использовать `mv` + `git add`.)

- [ ] **Step 2: Commit**

```bash
git add frontend/public/logo-horizontal.png frontend/public/logo-vertical.png
git commit -m "chore(frontend): add brand logos to public assets"
```

---

### Task 2: Брендовая тема в globals.css

Только замена значений CSS-переменных + новые токены. Классы в компонентах не трогаем — семантические токены подхватят цвета автоматически.

**Files:**

- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Заменить содержимое globals.css**

```css
@import 'tailwindcss';

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand: var(--brand);
  --color-brand-orange: var(--brand-orange);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  :root {
    /* GramJob brand: голубой (Telegram-blue) + тёмно-синий текст + оранжевый акцент */
    --background: oklch(0.99 0.003 240);
    --foreground: oklch(0.24 0.04 260);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.24 0.04 260);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.24 0.04 260);
    --primary: oklch(0.56 0.19 255);
    --primary-foreground: oklch(0.99 0 0);
    --secondary: oklch(0.96 0.012 245);
    --secondary-foreground: oklch(0.3 0.05 258);
    --muted: oklch(0.96 0.012 245);
    --muted-foreground: oklch(0.52 0.03 255);
    --accent: oklch(0.94 0.03 245);
    --accent-foreground: oklch(0.35 0.08 255);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.985 0 0);
    --border: oklch(0.91 0.01 245);
    --input: oklch(0.91 0.01 245);
    --ring: oklch(0.56 0.19 255);
    --brand: oklch(0.66 0.16 240);
    --brand-orange: oklch(0.76 0.15 65);
    --success: oklch(0.63 0.16 150);
    --warning: oklch(0.78 0.16 80);
    --radius: 0.625rem;
  }

  .dark {
    --background: oklch(0.16 0.02 258);
    --foreground: oklch(0.96 0.005 240);
    --card: oklch(0.21 0.025 258);
    --card-foreground: oklch(0.96 0.005 240);
    --popover: oklch(0.21 0.025 258);
    --popover-foreground: oklch(0.96 0.005 240);
    --primary: oklch(0.66 0.16 245);
    --primary-foreground: oklch(0.14 0.02 258);
    --secondary: oklch(0.27 0.03 258);
    --secondary-foreground: oklch(0.96 0.005 240);
    --muted: oklch(0.27 0.03 258);
    --muted-foreground: oklch(0.68 0.02 250);
    --accent: oklch(0.3 0.05 252);
    --accent-foreground: oklch(0.96 0.005 240);
    --destructive: oklch(0.704 0.191 22.216);
    --destructive-foreground: oklch(0.985 0 0);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.66 0.16 245);
    --brand: oklch(0.7 0.14 240);
    --brand-orange: oklch(0.78 0.14 65);
    --success: oklch(0.68 0.14 150);
    --warning: oklch(0.8 0.14 80);
  }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
  }
}

@utility bg-brand-gradient {
  background-image: linear-gradient(135deg, oklch(0.66 0.16 240), oklch(0.5 0.2 258));
}
```

- [ ] **Step 2: Проверить typecheck и тесты**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок TS, все существующие тесты зелёные (тема — только CSS).

- [ ] **Step 3: Визуальный смоук**

Run: `pnpm -C frontend dev` → открыть `http://localhost:3000/vacancies` — primary-кнопки стали синими, фон слегка холодный. Проверить и `/login`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(frontend): apply GramJob brand theme (blue/navy/orange) to design tokens"
```

⚠️ **Примечание к Mini App:** `lib/telegram-theme.ts` перезаписывает переменные значениями `--tg-theme-*` внутри Telegram — брендовая тема действует в web-версии, Mini App продолжает следовать теме Telegram. Это ожидаемое поведение, не менять.

---

### Task 3: components.json + установка shadcn/ui-компонентов

**Files:**

- Create: `frontend/components.json`
- Create (CLI): `frontend/src/components/ui/{badge,card,select,dialog,sheet,popover,dropdown-menu,tabs,tooltip,table,pagination,skeleton,alert,textarea,separator,avatar,checkbox,command,form}.tsx`
- Possibly modified by CLI: `button.tsx`, `input.tsx`, `label.tsx`

- [ ] **Step 1: Создать components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Установить компоненты через CLI**

```bash
cd frontend && pnpm dlx shadcn@latest add badge card select dialog sheet popover dropdown-menu tabs tooltip table pagination skeleton alert textarea separator avatar checkbox command form --yes --overwrite
```

`--overwrite` обновит `button/input/label` до актуальных версий — после установки просмотреть `git diff` этих трёх файлов: изменения допустимы только стилевые (варианты классов), API (`variant`, `size`, `asChild`) должен сохраниться.

- [ ] **Step 3: Проверить, что новые зависимости добавились**

Run: `git diff frontend/package.json`
Expected: добавлены `@radix-ui/react-*` пакеты (select, dialog, dropdown-menu, popover, tabs, tooltip, avatar, checkbox, separator), `cmdk`. Затем `pnpm install` (если CLI не установил).

- [ ] **Step 4: Проверить typecheck и тесты**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок, тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add frontend/components.json frontend/src/components/ui frontend/package.json pnpm-lock.yaml
git commit -m "feat(frontend): add shadcn/ui component library (18 components)"
```

---

### Task 4: Единый контейнер в AppShell

Правило проекта после этой задачи: **страницы НЕ задают собственный внешний контейнер** — ширину даёт AppShell (`max-w-6xl`). Узкий контент (формы, auth) центрируется внутри через `mx-auto max-w-2xl` — это единственное разрешённое исключение. Чистка самих страниц — Phase 3.

**Files:**

- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Обновить AppShell**

```tsx
'use client'

import { type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { useTelegramInit } from '@/hooks/useTelegramInit'
import { WebHeader } from './WebHeader'
import { BottomNav } from './BottomNav'
import { ModerationToastWatcher } from '@/components/moderation/ModerationToastWatcher'
import { StartParamRouter } from './StartParamRouter'

export function AppShell({ children }: { children: ReactNode }) {
  const { isMiniApp } = useTelegramInit()

  return (
    <div className="flex min-h-screen flex-col">
      {!isMiniApp && <WebHeader />}
      <main className={`flex-1 pb-20 md:pb-0 ${isMiniApp ? 'pb-20' : ''}`}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
      <BottomNav isMiniApp={isMiniApp} />
      <StartParamRouter />
      <ModerationToastWatcher />
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}
```

(`pb-20 md:pb-0` — запас под BottomNav на мобильном вебе; в Mini App `pb-20` всегда. `BottomNav` появится в Task 5 — до его завершения typecheck упадёт, поэтому Task 4 и 5 коммитятся вместе в Task 5 Step 5.)

- [ ] **Step 2: Не коммитить — перейти к Task 5**

---

### Task 5: BottomNav — мобильный веб + Mini App

Пункты по спеке §5: Вакансии, Отклики, Избранное, Кабинет. «Кабинет» → `/dashboard` (страница создаётся в Phase 4; до этого ссылка временно ведёт на 404 — допустимо в рамках последовательности фаз, Phase 4 обязательна к выполнению).

**Files:**

- Create: `frontend/src/components/layout/BottomNav.tsx` (замена `MiniAppBottomNav.tsx`)
- Delete: `frontend/src/components/layout/MiniAppBottomNav.tsx`
- Test: `frontend/src/components/layout/BottomNav.test.tsx`

- [ ] **Step 1: Написать падающий тест**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from './BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/favorites',
}))

describe('BottomNav', () => {
  it('показывает четыре пункта: Вакансии, Отклики, Избранное, Кабинет', () => {
    render(<BottomNav isMiniApp={false} />)
    expect(screen.getByText('Вакансии')).toBeInTheDocument()
    expect(screen.getByText('Отклики')).toBeInTheDocument()
    expect(screen.getByText('Избранное')).toBeInTheDocument()
    expect(screen.getByText('Кабинет')).toBeInTheDocument()
  })

  it('подсвечивает активный раздел через aria-current', () => {
    render(<BottomNav isMiniApp={false} />)
    const active = screen.getByRole('link', { name: /избранное/i })
    expect(active).toHaveAttribute('aria-current', 'page')
  })

  it('на вебе скрыт на desktop через md:hidden', () => {
    render(<BottomNav isMiniApp={false} />)
    expect(screen.getByRole('navigation')).toHaveClass('md:hidden')
  })

  it('в Mini App отображается без md:hidden', () => {
    render(<BottomNav isMiniApp />)
    expect(screen.getByRole('navigation')).not.toHaveClass('md:hidden')
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm -C frontend test -- BottomNav`
Expected: FAIL — `Cannot find module './BottomNav'`

- [ ] **Step 3: Реализовать BottomNav**

```tsx
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import { Briefcase, Heart, LayoutDashboard, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLink = {
  href: string
  icon: typeof Briefcase
  label: string
  isActive: (pathname: string) => boolean
}

export function BottomNav({ isMiniApp }: { isMiniApp: boolean }) {
  const { t } = useTranslation()
  const pathname = usePathname()

  const links: NavLink[] = [
    {
      href: '/vacancies',
      icon: Briefcase,
      label: t('nav.vacancies'),
      isActive: (p) => p.startsWith('/vacancies'),
    },
    {
      href: '/dashboard/applications',
      icon: MessageSquare,
      label: t('nav.applications'),
      isActive: (p) => p.startsWith('/dashboard/applications'),
    },
    {
      href: '/dashboard/favorites',
      icon: Heart,
      label: t('nav.favorites'),
      isActive: (p) => p.startsWith('/dashboard/favorites'),
    },
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      isActive: (p) =>
        p === '/dashboard' ||
        (p.startsWith('/dashboard') &&
          !p.startsWith('/dashboard/applications') &&
          !p.startsWith('/dashboard/favorites')),
    },
  ]

  return (
    <nav
      aria-label="Основная навигация"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        !isMiniApp && 'md:hidden'
      )}
    >
      <div className="mx-auto flex max-w-6xl pb-[env(safe-area-inset-bottom)]">
        {links.map(({ href, icon: Icon, label, isActive }) => {
          const active = isActive(pathname)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Удалить старый компонент и запустить тесты**

```bash
rm frontend/src/components/layout/MiniAppBottomNav.tsx
```

Run: `pnpm -C frontend test && pnpm -C frontend typecheck`
Expected: PASS, 0 ошибок TS (AppShell из Task 4 уже импортирует BottomNav).

- [ ] **Step 5: Commit (вместе с Task 4)**

```bash
git add frontend/src/components/layout/AppShell.tsx frontend/src/components/layout/BottomNav.tsx frontend/src/components/layout/BottomNav.test.tsx
git rm frontend/src/components/layout/MiniAppBottomNav.tsx 2>/dev/null; git add -u
git commit -m "feat(frontend): unified container in AppShell + mobile bottom navigation for web and mini app"
```

---

### Task 6: Редизайн WebHeader

Логотип-картинка, ссылки Вакансии/Резюме/Компании, user-dropdown (shadcn DropdownMenu). На мобильном вебе header сжимается до логотипа + уведомления + аватар-меню (основная навигация — BottomNav).

**Files:**

- Modify: `frontend/src/components/layout/WebHeader.tsx`
- Modify: `frontend/src/locales/ru/common.json`, `frontend/src/locales/en/common.json`

- [ ] **Step 1: Добавить ключи локализации**

В `frontend/src/locales/ru/common.json` в блок `nav` добавить:

```json
"resumes": "Резюме",
"companies": "Компании",
"subscription": "Подписка"
```

В `frontend/src/locales/en/common.json` в блок `nav` добавить:

```json
"resumes": "Resumes",
"companies": "Companies",
"subscription": "Subscription"
```

- [ ] **Step 2: Переписать WebHeader**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { FileText, LayoutDashboard, LogOut, Star } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { NotificationBadge } from '@/components/notification/NotificationBadge'

const NAV_LINKS = [
  { href: '/vacancies', key: 'nav.vacancies' },
  { href: '/resumes', key: 'nav.resumes' },
  { href: '/companies', key: 'nav.companies' },
] as const

export const WebHeader = observer(function WebHeader() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { auth } = useStores()

  const initial =
    auth.user?.firstName?.charAt(0) ??
    auth.user?.username?.charAt(0) ??
    auth.user?.email?.charAt(0) ??
    '?'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="GramJob — на главную" className="flex items-center">
            <Image
              src="/logo-horizontal.png"
              alt="GramJob"
              width={140}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                {t(key)}
              </Link>
            ))}
          </div>
        </div>

        {auth.isAuthenticated && auth.user ? (
          <div className="flex items-center gap-2">
            <Link href="/subscription" className="hidden md:flex" aria-label="Управление подпиской">
              <SubscriptionBadge plan={auth.user.subscriptionPlan} />
            </Link>
            <NotificationBadge />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Меню пользователя"
                  className="rounded-full outline-none ring-ring focus-visible:ring-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initial.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {auth.user.firstName ?? auth.user.username ?? auth.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('nav.dashboard')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/publications">
                    <FileText className="mr-2 h-4 w-4" />
                    {t('nav.publications')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/subscription">
                    <Star className="mr-2 h-4 w-4" />
                    {t('nav.subscription')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => auth.logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">{t('nav.login')}</Link>
          </Button>
        )}
      </nav>
    </header>
  )
})
```

Примечание: если у типа `User` нет поля `username` или `firstName` — проверить `frontend/src/types/api.ts` и использовать существующие поля (`firstName`, `lastName`, `email` есть точно), убрав лишнее из фолбэка `initial`.

- [ ] **Step 3: Проверить typecheck и тесты**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок, тесты зелёные.

- [ ] **Step 4: Визуальный смоук**

`pnpm -C frontend dev` → проверить: логотип виден, активная ссылка подсвечена, dropdown открывается, на ширине < 768px ссылки скрыты и виден BottomNav; горизонтального скролла нет.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/WebHeader.tsx frontend/src/locales/ru/common.json frontend/src/locales/en/common.json
git commit -m "feat(frontend): redesign web header with brand logo, section links and user menu"
```

---

### Task 7: Финальная верификация Phase 1

- [ ] **Step 1: Полный прогон**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test && pnpm -C frontend build`
Expected: 0 ошибок TS, все тесты зелёные, build успешен.

- [ ] **Step 2: Ручной смоук по чеклисту**

- [ ] Desktop (>1024px): header с логотипом, BottomNav скрыт
- [ ] Mobile (<768px): BottomNav виден, активный пункт синий, нет горизонтального скролла
- [ ] Тёмная тема Mini App не сломана (класс `.dark` рендерит тёмно-синие фоны)
- [ ] Кнопки primary — фирменный синий на всех страницах

---

## Self-Review

- Спека §2: components.json + 18 компонентов — Task 3 ✅; §4 единый контейнер — Task 4 ✅; §5 bottom nav (фиксация, только mobile, подсветка, иконки, transition-colors) — Task 5 ✅; логотипы — Tasks 1, 6 ✅.
- «Кабинет» в BottomNav ведёт на `/dashboard`, который появится в Phase 4 — зафиксировано как осознанная зависимость.
- Типы: `BottomNav({ isMiniApp })` согласован между Task 4 (AppShell) и Task 5.
