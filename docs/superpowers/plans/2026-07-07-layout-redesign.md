# Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Обновить шапку, BottomNav и Telegram-режим в соответствии со спеком layout-redesign.

**Architecture:** Выделяем переиспользуемые `LanguageDrawer` и `UserMenuDrawer`; новый `TelegramTopBar` (плавающие иконки) монтируется в AppShell только при `isMiniApp=true`; WebHeader получает условные nav-ссылки и обновлённый user-dropdown; BottomNav получает GramJob-пункт для Telegram.

**Tech Stack:** Next.js 15, React 19, MobX, shadcn Sheet, TailwindCSS 4, i18next, Lucide icons, Vitest + React Testing Library

---

## File Map

| Файл                                                     | Действие                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `frontend/src/locales/ru/common.json`                    | Добавить ключи `nav.myResumes`, `nav.resumeDatabase`, `nav.notifications` |
| `frontend/src/locales/en/common.json`                    | То же, EN-значения                                                        |
| `frontend/src/components/layout/LanguageDrawer.tsx`      | Создать                                                                   |
| `frontend/src/components/layout/LanguageDrawer.test.tsx` | Создать                                                                   |
| `frontend/src/components/layout/BottomNav.tsx`           | Изменить — добавить GramJob-пункт                                         |
| `frontend/src/components/layout/BottomNav.test.tsx`      | Изменить — добавить два теста                                             |
| `frontend/src/components/layout/WebHeader.tsx`           | Изменить — nav, dropdown, LanguageSwitcher                                |
| `frontend/src/components/layout/UserMenuDrawer.tsx`      | Создать                                                                   |
| `frontend/src/components/layout/TelegramTopBar.tsx`      | Создать                                                                   |
| `frontend/src/components/layout/TelegramTopBar.test.tsx` | Создать                                                                   |
| `frontend/src/components/layout/AppShell.tsx`            | Изменить — добавить TelegramTopBar                                        |

---

## Task 1: i18n — добавить недостающие nav-ключи

**Files:**

- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`

- [ ] **Step 1: Добавить три ключа в RU-локаль**

В `frontend/src/locales/ru/common.json` в объект `"nav"` добавить:

```json
"myResumes": "Мои резюме",
"resumeDatabase": "База резюме",
"notifications": "Уведомления"
```

Итоговый объект `"nav"` (показаны только изменённые строки, остальные не трогать):

```json
"nav": {
  "vacancies": "Вакансии",
  "resumes": "Резюме",
  "companies": "Компании",
  "myResumes": "Мои резюме",
  "resumeDatabase": "База резюме",
  "notifications": "Уведомления",
  ...
}
```

- [ ] **Step 2: Добавить три ключа в EN-локаль**

В `frontend/src/locales/en/common.json` в объект `"nav"` добавить:

```json
"myResumes": "My resumes",
"resumeDatabase": "Resume database",
"notifications": "Notifications"
```

- [ ] **Step 3: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/locales/ru/common.json src/locales/en/common.json
git commit -m "feat(i18n): add nav.myResumes, nav.resumeDatabase, nav.notifications keys"
```

---

## Task 2: LanguageDrawer — создать компонент и тест

**Files:**

- Create: `frontend/src/components/layout/LanguageDrawer.tsx`
- Create: `frontend/src/components/layout/LanguageDrawer.test.tsx`

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/components/layout/LanguageDrawer.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const changeLanguage = vi.fn()
vi.mock('@/lib/i18n', () => ({
  default: { changeLanguage: (...args: unknown[]) => changeLanguage(...args) },
}))

import { LanguageDrawer } from './LanguageDrawer'

describe('LanguageDrawer', () => {
  beforeEach(() => {
    changeLanguage.mockClear()
  })

  it('не рендерит пункты языков когда закрыт', () => {
    render(<LanguageDrawer open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Русский')).not.toBeInTheDocument()
    expect(screen.queryByText('English')).not.toBeInTheDocument()
  })

  it('показывает пункты RU и EN когда открыт', () => {
    render(<LanguageDrawer open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Русский')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('вызывает changeLanguage("en") при клике на English', () => {
    render(<LanguageDrawer open={true} onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByText('English'))
    expect(changeLanguage).toHaveBeenCalledWith('en')
  })

  it('вызывает onOpenChange(false) после выбора языка', () => {
    const onOpenChange = vi.fn()
    render(<LanguageDrawer open={true} onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByText('English'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

```bash
cd frontend && pnpm vitest run src/components/layout/LanguageDrawer.test.tsx
```

Ожидаемый результат: FAIL (модуль не существует).

- [ ] **Step 3: Создать LanguageDrawer.tsx**

Создать `frontend/src/components/layout/LanguageDrawer.tsx`:

```tsx
'use client'

import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18next from '@/lib/i18n'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LanguageDrawer({ open, onOpenChange }: Props) {
  const { i18n } = useTranslation()
  const currentLang = i18n.language

  const setLang = (lang: string) => {
    void i18next.changeLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gramjob_lang', lang)
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Язык / Language</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-4">
          <button
            type="button"
            onClick={() => setLang('ru')}
            className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent"
          >
            Русский
            {currentLang === 'ru' && <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent"
          >
            English
            {currentLang === 'en' && <Check className="h-4 w-4" />}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

```bash
cd frontend && pnpm vitest run src/components/layout/LanguageDrawer.test.tsx
```

Ожидаемый результат: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/layout/LanguageDrawer.tsx src/components/layout/LanguageDrawer.test.tsx
git commit -m "feat(layout): add LanguageDrawer component"
```

---

## Task 3: BottomNav — пункт GramJob для Telegram-режима

**Files:**

- Modify: `frontend/src/components/layout/BottomNav.tsx`
- Modify: `frontend/src/components/layout/BottomNav.test.tsx`

- [ ] **Step 1: Написать два падающих теста**

Добавить в `frontend/src/components/layout/BottomNav.test.tsx` после существующих тестов:

```tsx
it('в Mini App показывает пункт GramJob', () => {
  render(<BottomNav isMiniApp={true} />)
  expect(screen.getByText('GramJob')).toBeInTheDocument()
})

it('на вебе не показывает пункт GramJob', () => {
  render(<BottomNav isMiniApp={false} />)
  expect(screen.queryByText('GramJob')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Запустить тесты, убедиться что новые падают**

```bash
cd frontend && pnpm vitest run src/components/layout/BottomNav.test.tsx
```

Ожидаемый результат: 4 passed, 2 failed (GramJob-тесты).

- [ ] **Step 3: Обновить BottomNav.tsx**

Заменить полное содержимое `frontend/src/components/layout/BottomNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import { Briefcase, Heart, Home, LayoutDashboard, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLink = {
  href: string
  icon: typeof Briefcase
  label: string
  isActive: (pathname: string) => boolean
}

export function BottomNav({ isMiniApp }: { isMiniApp: boolean }) {
  const { t } = useTranslation('common')
  const pathname = usePathname()

  const baseLinks: NavLink[] = [
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

  const gramJobLink: NavLink = {
    href: '/',
    icon: Home,
    label: 'GramJob',
    isActive: (p) => p === '/',
  }

  const links = isMiniApp ? [gramJobLink, ...baseLinks] : baseLinks

  return (
    <nav
      aria-label={t('nav.main')}
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

- [ ] **Step 4: Запустить все тесты BottomNav**

```bash
cd frontend && pnpm vitest run src/components/layout/BottomNav.test.tsx
```

Ожидаемый результат: 6 passed.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/layout/BottomNav.tsx src/components/layout/BottomNav.test.tsx
git commit -m "feat(layout): add GramJob item to BottomNav in Telegram mode"
```

---

## Task 4: WebHeader — условные nav-ссылки, dropdown, языковой переключатель

**Files:**

- Modify: `frontend/src/components/layout/WebHeader.tsx`

Этот таск — чисто правки существующего файла, юнит-тестов у WebHeader нет, проверка через `typecheck`.

- [ ] **Step 1: Обновить импорты в WebHeader.tsx**

В начале файла:

- Добавить `useState` в импорт из `'react'`
- В импорте из `'lucide-react'` добавить `User` — итого: `{ Check, FileText, Globe, LayoutDashboard, LogOut, Star, User }`
- Добавить строку импорта LanguageDrawer после импорта i18next:

```tsx
import { LanguageDrawer } from './LanguageDrawer'
```

- [ ] **Step 2: Заменить NAV_LINKS на STATIC_NAV_LINKS (только Вакансии и Компании)**

Заменить:

```tsx
const NAV_LINKS = [
  { href: '/vacancies', key: 'nav.vacancies' },
  { href: '/resumes', key: 'nav.resumes' },
  { href: '/companies', key: 'nav.companies' },
] as const
```

На:

```tsx
const STATIC_NAV_LINKS = [
  { href: '/vacancies', key: 'nav.vacancies' },
  { href: '/companies', key: 'nav.companies' },
] as const
```

- [ ] **Step 3: Добавить useState для langDrawerOpen внутрь WebHeader**

В теле функции `WebHeader` (после `const initial = ...`) добавить:

```tsx
const [langDrawerOpen, setLangDrawerOpen] = useState(false)
```

- [ ] **Step 4: Обновить nav — статические + условные ссылки**

Найти блок:

```tsx
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
```

Заменить на:

```tsx
<div className="hidden items-center gap-1 md:flex">
  {STATIC_NAV_LINKS.map(({ href, key }) => (
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
  {auth.isAuthenticated && (
    <Link
      href="/dashboard/resumes"
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        pathname.startsWith('/dashboard/resumes')
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
    >
      {t('nav.myResumes')}
    </Link>
  )}
  {auth.isAuthenticated &&
    (auth.user?.subscriptionPlan === 'max' || auth.user?.subscriptionPlan === 'vip') && (
      <Link
        href="/resumes"
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          pathname.startsWith('/resumes')
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
      >
        {t('nav.resumeDatabase')}
      </Link>
    )}
</div>
```

- [ ] **Step 5: Удалить SubscriptionBadge из правой части шапки**

Найти и удалить весь блок:

```tsx
<Link href="/subscription" className="hidden md:flex" aria-label={t('nav.subscription')}>
  <SubscriptionBadge plan={auth.user.subscriptionPlan} />
</Link>
```

- [ ] **Step 6: Обновить DropdownMenuLabel — иконка + lastName + SubscriptionBadge**

Найти:

```tsx
<DropdownMenuLabel className="truncate">{auth.user.firstName ?? auth.user.email}</DropdownMenuLabel>
```

Заменить на:

```tsx
<DropdownMenuLabel className="flex items-center gap-2">
  <User className="h-4 w-4 shrink-0" />
  <span className="truncate">
    {auth.user.firstName ?? auth.user.email}
    {auth.user.lastName ? ` ${auth.user.lastName}` : ''}
  </span>
  <SubscriptionBadge plan={auth.user.subscriptionPlan} />
</DropdownMenuLabel>
```

- [ ] **Step 7: Заменить LanguageSwitcher на dual мобильный/десктопный вариант**

Найти в обоих ветках (auth и unauth) вызовы `<LanguageSwitcher />` и заменить их на:

```tsx
{
  /* мобиль: Globe открывает Drawer */
}
;<div className="md:hidden">
  <Button
    variant="ghost"
    size="icon"
    aria-label={t('nav.languageSwitcher')}
    className="h-8 w-8"
    onClick={() => setLangDrawerOpen(true)}
  >
    <Globe className="h-4 w-4" />
  </Button>
</div>
{
  /* десктоп: Globe открывает DropdownMenu */
}
;<div className="hidden md:block">
  <LanguageSwitcher />
</div>
```

А также добавить `<LanguageDrawer open={langDrawerOpen} onOpenChange={setLangDrawerOpen} />` перед закрывающим тегом `</header>`.

- [ ] **Step 8: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок. Если `SubscriptionBadge` остался импортированным но не используется — удалить импорт (он всё ещё используется в DropdownMenuLabel, поэтому удалять не нужно).

- [ ] **Step 9: Commit**

```bash
cd frontend && git add src/components/layout/WebHeader.tsx
git commit -m "feat(layout): update WebHeader nav, dropdown, mobile language drawer"
```

---

## Task 5: UserMenuDrawer — меню профиля для Telegram

**Files:**

- Create: `frontend/src/components/layout/UserMenuDrawer.tsx`

Этот компонент используется только в TelegramTopBar, тестируется в рамках TelegramTopBar в Task 6.

- [ ] **Step 1: Создать UserMenuDrawer.tsx**

Создать `frontend/src/components/layout/UserMenuDrawer.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Globe, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { LanguageDrawer } from './LanguageDrawer'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const UserMenuDrawer = observer(function UserMenuDrawer({ open, onOpenChange }: Props) {
  const { auth } = useStores()
  const { t } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)

  if (!auth.isAuthenticated || !auth.user) return null

  const initial = auth.user.firstName?.charAt(0) ?? auth.user.email?.charAt(0) ?? '?'
  const displayName = auth.user.firstName + (auth.user.lastName ? ` ${auth.user.lastName}` : '')

  const close = () => onOpenChange(false)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom">
          <SheetHeader>
            <Link
              href="/dashboard/profile"
              onClick={close}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-accent"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {initial.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <span className="font-medium leading-none">{displayName}</span>
                <SubscriptionBadge plan={auth.user.subscriptionPlan} />
              </div>
            </Link>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-4 pb-4">
            <Link
              href="/dashboard/notifications"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              <Bell className="h-4 w-4" />
              {t('nav.notifications')}
            </Link>
            <Link
              href="/subscription"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              <Star className="h-4 w-4" />
              {t('nav.subscription')}
            </Link>
            <button
              type="button"
              onClick={() => {
                close()
                setLangOpen(true)
              }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent"
            >
              <Globe className="h-4 w-4" />
              {t('nav.languageSwitcher')}
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <LanguageDrawer open={langOpen} onOpenChange={setLangOpen} />
    </>
  )
})
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/layout/UserMenuDrawer.tsx
git commit -m "feat(layout): add UserMenuDrawer for Telegram profile menu"
```

---

## Task 6: TelegramTopBar — плавающие иконки для Mini App

**Files:**

- Create: `frontend/src/components/layout/TelegramTopBar.tsx`
- Create: `frontend/src/components/layout/TelegramTopBar.test.tsx`

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/components/layout/TelegramTopBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUseStores = vi.fn()
vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => mockUseStores(),
}))

vi.mock('./UserMenuDrawer', () => ({
  UserMenuDrawer: () => null,
}))

vi.mock('./LanguageDrawer', () => ({
  LanguageDrawer: () => null,
}))

import { TelegramTopBar } from './TelegramTopBar'

const unauthStores = () => ({
  auth: { isAuthenticated: false, user: null },
  notification: { unreadCount: 0 },
})

const authStores = () => ({
  auth: {
    isAuthenticated: true,
    user: {
      firstName: 'Alice',
      lastName: '',
      email: 'alice@example.com',
      subscriptionPlan: 'free' as const,
    },
  },
  notification: { unreadCount: 0 },
})

describe('TelegramTopBar', () => {
  beforeEach(() => {
    mockUseStores.mockReset()
  })

  it('Globe-кнопка рендерится для неавторизованного пользователя', () => {
    mockUseStores.mockReturnValue(unauthStores())
    render(<TelegramTopBar />)
    expect(screen.getByLabelText('Язык интерфейса')).toBeInTheDocument()
  })

  it('Avatar и Bell не рендерятся для неавторизованного', () => {
    mockUseStores.mockReturnValue(unauthStores())
    render(<TelegramTopBar />)
    expect(screen.queryByLabelText('Меню пользователя')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Уведомления')).not.toBeInTheDocument()
  })

  it('Avatar и Bell рендерятся для авторизованного', () => {
    mockUseStores.mockReturnValue(authStores())
    render(<TelegramTopBar />)
    expect(screen.getByLabelText('Меню пользователя')).toBeInTheDocument()
    expect(screen.getByLabelText('Уведомления')).toBeInTheDocument()
  })

  it('показывает счётчик непрочитанных уведомлений', () => {
    mockUseStores.mockReturnValue({
      ...authStores(),
      notification: { unreadCount: 5 },
    })
    render(<TelegramTopBar />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

```bash
cd frontend && pnpm vitest run src/components/layout/TelegramTopBar.test.tsx
```

Ожидаемый результат: FAIL (модуль не существует).

- [ ] **Step 3: Создать TelegramTopBar.tsx**

Создать `frontend/src/components/layout/TelegramTopBar.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LanguageDrawer } from './LanguageDrawer'
import { UserMenuDrawer } from './UserMenuDrawer'

export const TelegramTopBar = observer(function TelegramTopBar() {
  const { auth, notification } = useStores()
  const { t } = useTranslation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const initial = auth.user?.firstName?.charAt(0) ?? auth.user?.email?.charAt(0) ?? '?'

  return (
    <>
      <div className="fixed right-4 top-3 z-50 flex items-center gap-2">
        {auth.isAuthenticated && auth.user && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur"
            onClick={() => setUserMenuOpen(true)}
            aria-label={t('nav.userMenu')}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initial.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}

        {auth.isAuthenticated && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full bg-background/80 backdrop-blur"
          >
            <Link href="/dashboard/notifications" aria-label={t('notifications.ariaLabel')}>
              <Bell className="h-4 w-4" />
              {notification.unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
                </span>
              )}
            </Link>
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur"
          onClick={() => setLangOpen(true)}
          aria-label={t('nav.languageSwitcher')}
        >
          <Globe className="h-4 w-4" />
        </Button>
      </div>

      {auth.isAuthenticated && auth.user && (
        <UserMenuDrawer open={userMenuOpen} onOpenChange={setUserMenuOpen} />
      )}
      <LanguageDrawer open={langOpen} onOpenChange={setLangOpen} />
    </>
  )
})
```

- [ ] **Step 4: Запустить тесты, убедиться что проходят**

```bash
cd frontend && pnpm vitest run src/components/layout/TelegramTopBar.test.tsx
```

Ожидаемый результат: 4 passed.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/layout/TelegramTopBar.tsx src/components/layout/TelegramTopBar.test.tsx
git commit -m "feat(layout): add TelegramTopBar with floating avatar/bell/globe icons"
```

---

## Task 7: AppShell — подключить TelegramTopBar

**Files:**

- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Обновить AppShell.tsx**

Добавить импорт TelegramTopBar:

```tsx
import { TelegramTopBar } from './TelegramTopBar'
```

Заменить в теле компонента:

```tsx
// ДО:
{!isMiniApp && <WebHeader />}
<main className={`flex-1 ${isMiniApp ? 'pb-20' : 'pb-20 md:pb-0'}`}>

// ПОСЛЕ:
{!isMiniApp && <WebHeader />}
{isMiniApp && <TelegramTopBar />}
<main className={`flex-1 ${isMiniApp ? 'pt-14 pb-20' : 'pb-20 md:pb-0'}`}>
```

- [ ] **Step 2: Прогнать все тесты**

```bash
cd frontend && pnpm test
```

Ожидаемый результат: все тесты проходят (количество выросло за счёт новых тестов).

- [ ] **Step 3: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/components/layout/AppShell.tsx
git commit -m "feat(layout): wire TelegramTopBar into AppShell for Mini App mode"
```

---

## Финальная проверка

- [ ] Прогнать полный тест-сьют: `cd frontend && pnpm test`
- [ ] Проверить TypeScript: `cd frontend && pnpm typecheck`
- [ ] Проверить линтер: `cd frontend && pnpm lint`
