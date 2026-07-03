# Sprint 9 Frontend (Telegram Mini App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Приложение полноценно работает внутри Telegram Mini App: нативные кнопки (MainButton/BackButton), haptic feedback, адаптация темы под `--tg-theme-*`, deep link роутинг `startapp=...`, страница деталей отклика и профиль для bottom navigation.

**Architecture:** Вся Telegram-специфика инкапсулируется в `lib/telegram.ts` (+ `lib/telegram-theme.ts`) и двух хуках (`useTelegramMainButton`, `useTelegramBackButton`), которые no-op вне Mini App — web-версия не меняет поведение. Deep links обрабатывает клиентский компонент `StartParamRouter` в `AppShell`. Для `startapp=application_{id}` создаётся страница `/dashboard/applications/[id]` + новый backend endpoint `GET /applications/:id`. Тема применяется маппингом `themeParams` → существующие shadcn CSS-переменные + перевод hardcoded-серых классов на семантические токены.

**Tech Stack:** Next.js 15 App Router, React 19, MobX, Telegram WebApp JS API (`telegram-web-app.js`), TailwindCSS 4 + shadcn-токены, Vitest + Testing Library (frontend), Jest (backend), Strapi 5.

**Решения (согласованы с пользователем 2026-07-02):**

- Deep link `application_{id}` → **создать страницу деталей** `/dashboard/applications/[id]` (нужен новый endpoint `GET /applications/:id`).
- MainButton и BackButton подключаются **точечно на каждом экране** (без глобальной логики в AppShell по pathname). Для DRY используются хуки, но вызов — вручную в каждом клиент-компоненте.
- QA-прогон внутри Telegram — **чеклист-документ** `docs/qa/sprint9-miniapp-checklist.md`; сам прогон пользователь выполняет вручную, чекбокс в `sprint-plan.md` отмечается после него.

**Конвенции проекта (обязательны):**

- Коммиты **без** `Co-Authored-By`.
- `exactOptionalPropertyTypes: true` + `noUncheckedIndexedAccess: true` — опциональные поля через conditional spread; результат regexp-match проверять на `undefined`.
- Frontend-тесты: Vitest + `@testing-library/react`, jsdom, описания на русском. Setup: `frontend/src/test/setup.ts` (реальный i18n).
- Backend-тесты: Jest, `backend/tests/unit/*.test.ts`, паттерн — выносить чистые функции и тестировать их (см. `backend/tests/unit/is-vacancy-owner.test.ts`).
- Тексты UI дашбордов — хардкод на русском (как в существующих клиентах).
- Команды: `pnpm -C frontend test`, `pnpm -C frontend typecheck`, `pnpm -C backend test`, `pnpm -C backend typecheck` (из корня репо).

---

## Контекст: что уже есть (проверено 2026-07-02)

| Что                                                                                                                                             | Где                                                                                            | Статус                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| `isTelegramMiniApp()`, `getTelegramWebApp()`, тип `TelegramWebApp` (MainButton/BackButton/HapticFeedback/openInvoice/setHeaderColor уже в типе) | `frontend/src/lib/telegram.ts`                                                                 | ✅ есть                   |
| `useTelegramInit` — ready/expand + auto-login по initData                                                                                       | `frontend/src/hooks/useTelegramInit.ts`                                                        | ✅ есть                   |
| Layout-адаптация: WebHeader скрыт в Mini App, MiniAppBottomNav показан                                                                          | `frontend/src/components/layout/AppShell.tsx`                                                  | ✅ есть                   |
| Bottom navigation (вакансии/избранное/отклики/профиль)                                                                                          | `frontend/src/components/layout/MiniAppBottomNav.tsx`                                          | ✅ есть                   |
| Платёжный флоу `tg.openInvoice` + web fallback                                                                                                  | `frontend/src/hooks/useTelegramPayment.ts`                                                     | ✅ есть                   |
| Backend deep link контракт: `vacancy_{documentId}`, `application_{documentId}`, `subscription`                                                  | `backend/src/api/payment/services/telegram-bot.ts:131` + контрактные тесты Sprint 9 Backend    | ✅ есть                   |
| **Скрипт `telegram-web-app.js` НЕ подключён** — `window.Telegram` никогда не появится, вся Mini App-ветка мертва                                | `frontend/src/app/layout.tsx`                                                                  | ❌ Task 1 (критично)      |
| Обработка `start_param` (deep links) на фронте                                                                                                  | нигде                                                                                          | ❌ Task 6                 |
| MainButton / BackButton / HapticFeedback — использование                                                                                        | нигде                                                                                          | ❌ Tasks 4, 5, 14, 15, 16 |
| Тема `--tg-theme-*`, `setHeaderColor`/`setBackgroundColor`                                                                                      | нигде                                                                                          | ❌ Tasks 7, 8             |
| Страница `/dashboard/profile` (bottom nav ссылается — сейчас 404)                                                                               | нет                                                                                            | ❌ Task 13                |
| `GET /applications/:id` на backend                                                                                                              | нет (только GET /applications, POST, GET /vacancies/:id/applications, PATCH /applications/:id) | ❌ Tasks 9, 10            |
| Страница `/dashboard/applications/[id]`                                                                                                         | нет                                                                                            | ❌ Tasks 11, 12           |

---

### Task 1: Подключить telegram-web-app.js

Без этого скрипта `window.Telegram.WebApp` не существует и весь Mini App-режим не активируется. Конфигурационное изменение — юнит-тест не пишем, проверяем typecheck + существующие тесты.

**Files:**

- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Добавить Script в root layout**

В `frontend/src/app/layout.tsx` добавить импорт и скрипт:

```tsx
import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
```

Внутри `<html>` первой строкой перед `<body>`:

```tsx
    <html lang="ru" className={inter.variable}>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <body className="font-sans antialiased">
```

- [ ] **Step 2: Проверка**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок TS, 310 тестов проходят.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat(miniapp): load telegram-web-app.js in root layout"
```

---

### Task 2: parseStartParam — разбор deep link start_param

**Files:**

- Modify: `frontend/src/lib/telegram.ts`
- Test: `frontend/src/lib/telegram.test.ts` (создать)

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/lib/telegram.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseStartParam } from './telegram'

describe('parseStartParam', () => {
  it('vacancy_{documentId} → /vacancies/{documentId}', () => {
    expect(parseStartParam('vacancy_abc123XYZ')).toBe('/vacancies/abc123XYZ')
  })

  it('application_{documentId} → /dashboard/applications/{documentId}', () => {
    expect(parseStartParam('application_q1w2e3')).toBe('/dashboard/applications/q1w2e3')
  })

  it('subscription → /subscription', () => {
    expect(parseStartParam('subscription')).toBe('/subscription')
  })

  it('возвращает null для неизвестного формата', () => {
    expect(parseStartParam('unknown_thing')).toBeNull()
    expect(parseStartParam('vacancy_')).toBeNull()
    expect(parseStartParam('vacancy')).toBeNull()
  })

  it('возвращает null для пустого значения', () => {
    expect(parseStartParam(undefined)).toBeNull()
    expect(parseStartParam(null)).toBeNull()
    expect(parseStartParam('')).toBeNull()
  })

  it('отклоняет id с недопустимыми символами (path traversal)', () => {
    expect(parseStartParam('vacancy_../../etc')).toBeNull()
    expect(parseStartParam('application_a/b')).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm -C frontend test -- src/lib/telegram.test.ts`
Expected: FAIL — `parseStartParam` не экспортируется.

- [ ] **Step 3: Реализация**

В конец `frontend/src/lib/telegram.ts` добавить:

```ts
export function parseStartParam(param: string | null | undefined): string | null {
  if (!param) return null
  if (param === 'subscription') return '/subscription'
  const match = /^(vacancy|application)_([A-Za-z0-9]+)$/.exec(param)
  const kind = match?.[1]
  const id = match?.[2]
  if (!kind || !id) return null
  return kind === 'vacancy' ? `/vacancies/${id}` : `/dashboard/applications/${id}`
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm -C frontend test -- src/lib/telegram.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/telegram.ts frontend/src/lib/telegram.test.ts
git commit -m "feat(miniapp): add parseStartParam for deep link routing"
```

---

### Task 3: Haptic-хелперы

Обёртки, безопасные вне Mini App (no-op).

**Files:**

- Modify: `frontend/src/lib/telegram.ts`
- Test: `frontend/src/lib/telegram.test.ts`

- [ ] **Step 1: Написать падающие тесты**

Добавить в `frontend/src/lib/telegram.test.ts`:

```ts
import { afterEach, vi } from 'vitest'
import { hapticImpact, hapticNotify, hapticSelection } from './telegram'

function mockTelegramHaptics() {
  const HapticFeedback = {
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    selectionChanged: vi.fn(),
  }
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: { initData: 'user=1', HapticFeedback },
  }
  return HapticFeedback
}

describe('haptic-хелперы', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
  })

  it('hapticImpact вызывает impactOccurred (по умолчанию light)', () => {
    const h = mockTelegramHaptics()
    hapticImpact()
    expect(h.impactOccurred).toHaveBeenCalledWith('light')
    hapticImpact('medium')
    expect(h.impactOccurred).toHaveBeenCalledWith('medium')
  })

  it('hapticNotify вызывает notificationOccurred', () => {
    const h = mockTelegramHaptics()
    hapticNotify('success')
    expect(h.notificationOccurred).toHaveBeenCalledWith('success')
  })

  it('hapticSelection вызывает selectionChanged', () => {
    const h = mockTelegramHaptics()
    hapticSelection()
    expect(h.selectionChanged).toHaveBeenCalledOnce()
  })

  it('вне Mini App — no-op без исключений', () => {
    expect(() => {
      hapticImpact()
      hapticNotify('error')
      hapticSelection()
    }).not.toThrow()
  })
})
```

Примечание: объединить импорты vitest в один (`import { describe, it, expect, afterEach, vi } from 'vitest'` вверху файла).

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C frontend test -- src/lib/telegram.test.ts`
Expected: FAIL — хелперы не экспортируются.

- [ ] **Step 3: Реализация**

В `frontend/src/lib/telegram.ts` добавить:

```ts
export function hapticImpact(
  style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'
): void {
  getTelegramWebApp()?.HapticFeedback.impactOccurred(style)
}

export function hapticNotify(type: 'error' | 'success' | 'warning'): void {
  getTelegramWebApp()?.HapticFeedback.notificationOccurred(type)
}

export function hapticSelection(): void {
  getTelegramWebApp()?.HapticFeedback.selectionChanged()
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm -C frontend test -- src/lib/telegram.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/telegram.ts frontend/src/lib/telegram.test.ts
git commit -m "feat(miniapp): add haptic feedback helpers"
```

---

### Task 4: Хук useTelegramBackButton

**Files:**

- Create: `frontend/src/hooks/useTelegramBackButton.ts`
- Test: `frontend/src/hooks/useTelegramBackButton.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/hooks/useTelegramBackButton.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTelegramBackButton } from './useTelegramBackButton'

const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
}))

function mockTelegramBackButton() {
  const BackButton = {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
  }
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: { initData: 'user=1', BackButton },
  }
  return BackButton
}

describe('useTelegramBackButton', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
    vi.clearAllMocks()
  })

  it('показывает BackButton и навешивает обработчик router.back', () => {
    const bb = mockTelegramBackButton()
    renderHook(() => useTelegramBackButton())
    expect(bb.show).toHaveBeenCalledOnce()
    expect(bb.onClick).toHaveBeenCalledOnce()
    const handler = bb.onClick.mock.calls[0]?.[0] as () => void
    handler()
    expect(mockBack).toHaveBeenCalledOnce()
  })

  it('при unmount снимает обработчик и прячет кнопку', () => {
    const bb = mockTelegramBackButton()
    const { unmount } = renderHook(() => useTelegramBackButton())
    unmount()
    expect(bb.offClick).toHaveBeenCalledOnce()
    expect(bb.hide).toHaveBeenCalledOnce()
  })

  it('вне Mini App — no-op', () => {
    expect(() => renderHook(() => useTelegramBackButton())).not.toThrow()
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C frontend test -- src/hooks/useTelegramBackButton.test.ts`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализация**

Создать `frontend/src/hooks/useTelegramBackButton.ts`:

```ts
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram'

export function useTelegramBackButton(): void {
  const router = useRouter()

  useEffect(() => {
    if (!isTelegramMiniApp()) return
    const twa = getTelegramWebApp()
    if (!twa) return
    const handler = () => router.back()
    twa.BackButton.onClick(handler)
    twa.BackButton.show()
    return () => {
      twa.BackButton.offClick(handler)
      twa.BackButton.hide()
    }
  }, [router])
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm -C frontend test -- src/hooks/useTelegramBackButton.test.ts`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useTelegramBackButton.ts frontend/src/hooks/useTelegramBackButton.test.ts
git commit -m "feat(miniapp): add useTelegramBackButton hook"
```

---

### Task 5: Хук useTelegramMainButton

Возвращает `true` в Mini App (форма скрывает свою submit-кнопку). Поддерживает `visible` (для диалогов) и `disabled`. Актуальный `onClick` хранится в ref — колбэк не переподписывается на каждый рендер.

**Files:**

- Create: `frontend/src/hooks/useTelegramMainButton.ts`
- Test: `frontend/src/hooks/useTelegramMainButton.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/hooks/useTelegramMainButton.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTelegramMainButton } from './useTelegramMainButton'

function mockTelegramMainButton() {
  const MainButton = {
    text: '',
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    showProgress: vi.fn(),
    hideProgress: vi.fn(),
  }
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: { initData: 'user=1', MainButton },
  }
  return MainButton
}

describe('useTelegramMainButton', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
    vi.clearAllMocks()
  })

  it('в Mini App показывает кнопку, ставит текст и возвращает true', async () => {
    const mb = mockTelegramMainButton()
    const onClick = vi.fn()
    const { result } = renderHook(() => useTelegramMainButton({ text: 'Сохранить', onClick }))
    await waitFor(() => expect(result.current).toBe(true))
    expect(mb.show).toHaveBeenCalled()
    expect(mb.text).toBe('Сохранить')
    const handler = mb.onClick.mock.calls[0]?.[0] as () => void
    handler()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled=true вызывает disable', async () => {
    const mb = mockTelegramMainButton()
    renderHook(() => useTelegramMainButton({ text: 'X', onClick: vi.fn(), disabled: true }))
    await waitFor(() => expect(mb.disable).toHaveBeenCalled())
  })

  it('visible=false не показывает кнопку', async () => {
    const mb = mockTelegramMainButton()
    const { result } = renderHook(() =>
      useTelegramMainButton({ text: 'X', onClick: vi.fn(), visible: false })
    )
    await waitFor(() => expect(result.current).toBe(true))
    expect(mb.show).not.toHaveBeenCalled()
  })

  it('при unmount снимает обработчик и прячет кнопку', async () => {
    const mb = mockTelegramMainButton()
    const { unmount, result } = renderHook(() =>
      useTelegramMainButton({ text: 'X', onClick: vi.fn() })
    )
    await waitFor(() => expect(result.current).toBe(true))
    unmount()
    expect(mb.offClick).toHaveBeenCalledOnce()
    expect(mb.hide).toHaveBeenCalled()
  })

  it('вне Mini App возвращает false и не падает', () => {
    const { result } = renderHook(() => useTelegramMainButton({ text: 'X', onClick: vi.fn() }))
    expect(result.current).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C frontend test -- src/hooks/useTelegramMainButton.test.ts`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализация**

Создать `frontend/src/hooks/useTelegramMainButton.ts`:

```ts
'use client'

import { useEffect, useRef, useState } from 'react'
import { getTelegramWebApp, isTelegramMiniApp } from '@/lib/telegram'

interface MainButtonOptions {
  text: string
  onClick: () => void
  disabled?: boolean
  visible?: boolean
}

// Возвращает true в Mini App — вызывающая форма должна скрыть свою submit-кнопку.
export function useTelegramMainButton({
  text,
  onClick,
  disabled = false,
  visible = true,
}: MainButtonOptions): boolean {
  const [isMiniApp, setIsMiniApp] = useState(false)
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  useEffect(() => {
    setIsMiniApp(isTelegramMiniApp())
  }, [])

  useEffect(() => {
    if (!isMiniApp || !visible) return
    const twa = getTelegramWebApp()
    if (!twa) return
    const handler = () => onClickRef.current()
    twa.MainButton.onClick(handler)
    twa.MainButton.show()
    return () => {
      twa.MainButton.offClick(handler)
      twa.MainButton.hide()
    }
  }, [isMiniApp, visible])

  useEffect(() => {
    if (!isMiniApp || !visible) return
    const twa = getTelegramWebApp()
    if (!twa) return
    twa.MainButton.text = text
    if (disabled) twa.MainButton.disable()
    else twa.MainButton.enable()
  }, [isMiniApp, visible, text, disabled])

  return isMiniApp
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm -C frontend test -- src/hooks/useTelegramMainButton.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useTelegramMainButton.ts frontend/src/hooks/useTelegramMainButton.test.ts
git commit -m "feat(miniapp): add useTelegramMainButton hook"
```

---

### Task 6: StartParamRouter — deep link роутинг в AppShell

**Files:**

- Create: `frontend/src/components/layout/StartParamRouter.tsx`
- Test: `frontend/src/components/layout/StartParamRouter.test.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/components/layout/StartParamRouter.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { StartParamRouter } from './StartParamRouter'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

function mockTelegram(startParam?: string) {
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: {
      initData: 'user=1',
      initDataUnsafe: {
        ...(startParam ? { start_param: startParam } : {}),
        auth_date: 1,
        hash: 'h',
      },
    },
  }
}

describe('StartParamRouter', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
    vi.clearAllMocks()
  })

  it('редиректит по start_param=vacancy_abc', () => {
    mockTelegram('vacancy_abc')
    render(<StartParamRouter />)
    expect(mockReplace).toHaveBeenCalledExactlyOnceWith('/vacancies/abc')
  })

  it('редиректит только один раз при повторном рендере', () => {
    mockTelegram('subscription')
    const { rerender } = render(<StartParamRouter />)
    rerender(<StartParamRouter />)
    expect(mockReplace).toHaveBeenCalledTimes(1)
  })

  it('без start_param не редиректит', () => {
    mockTelegram()
    render(<StartParamRouter />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('вне Mini App не редиректит', () => {
    render(<StartParamRouter />)
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C frontend test -- src/components/layout/StartParamRouter.test.tsx`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализация**

Создать `frontend/src/components/layout/StartParamRouter.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getTelegramWebApp, isTelegramMiniApp, parseStartParam } from '@/lib/telegram'

export function StartParamRouter() {
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current || !isTelegramMiniApp()) return
    handled.current = true
    const route = parseStartParam(getTelegramWebApp()?.initDataUnsafe.start_param)
    if (route) router.replace(route)
  }, [router])

  return null
}
```

- [ ] **Step 4: Подключить в AppShell**

В `frontend/src/components/layout/AppShell.tsx`:

```tsx
import { StartParamRouter } from './StartParamRouter'
```

И в JSX после `{isMiniApp && <MiniAppBottomNav />}`:

```tsx
<StartParamRouter />
```

- [ ] **Step 5: Тесты зелёные**

Run: `pnpm -C frontend test -- src/components/layout/StartParamRouter.test.tsx && pnpm -C frontend typecheck`
Expected: PASS (4 теста), 0 ошибок TS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/StartParamRouter.tsx frontend/src/components/layout/StartParamRouter.test.tsx frontend/src/components/layout/AppShell.tsx
git commit -m "feat(miniapp): route startapp deep links to app pages"
```

---

### Task 7: Тема — applyTelegramTheme + setHeaderColor/setBackgroundColor

Маппинг `themeParams` (hex-цвета от Telegram) на существующие shadcn CSS-переменные через `style.setProperty` на `:root` — hex-значения валидны как значения кастомных свойств рядом с oklch. Плюс класс `.dark` по `colorScheme` и брендинг шапки.

**Files:**

- Create: `frontend/src/lib/telegram-theme.ts`
- Test: `frontend/src/lib/telegram-theme.test.ts`
- Modify: `frontend/src/lib/telegram.ts` (добавить `onEvent`/`offEvent` в тип)
- Modify: `frontend/src/hooks/useTelegramInit.ts`

- [ ] **Step 1: Расширить тип TelegramWebApp**

В `frontend/src/lib/telegram.ts` в интерфейс `TelegramWebApp` после `openInvoice` добавить:

```ts
  onEvent: (eventType: string, cb: () => void) => void
  offEvent: (eventType: string, cb: () => void) => void
```

- [ ] **Step 2: Написать падающий тест**

Создать `frontend/src/lib/telegram-theme.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { applyTelegramTheme } from './telegram-theme'
import type { TelegramWebApp } from './telegram'

function makeTwa(overrides: Partial<TelegramWebApp> = {}): TelegramWebApp {
  return {
    colorScheme: 'light',
    themeParams: {},
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    ...overrides,
  } as unknown as TelegramWebApp
}

describe('applyTelegramTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style')
    document.documentElement.classList.remove('dark')
  })

  it('маппит themeParams на shadcn CSS-переменные', () => {
    applyTelegramTheme(
      makeTwa({
        themeParams: {
          bg_color: '#ffffff',
          text_color: '#111111',
          button_color: '#2481cc',
          hint_color: '#999999',
        },
      })
    )
    const style = document.documentElement.style
    expect(style.getPropertyValue('--background')).toBe('#ffffff')
    expect(style.getPropertyValue('--foreground')).toBe('#111111')
    expect(style.getPropertyValue('--primary')).toBe('#2481cc')
    expect(style.getPropertyValue('--muted-foreground')).toBe('#999999')
  })

  it('пропускает отсутствующие параметры', () => {
    applyTelegramTheme(makeTwa({ themeParams: { text_color: '#222222' } }))
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('')
  })

  it('ставит класс dark при colorScheme=dark и снимает при light', () => {
    const dark = makeTwa({ colorScheme: 'dark' })
    applyTelegramTheme(dark)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTelegramTheme(makeTwa({ colorScheme: 'light' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('вызывает setHeaderColor и setBackgroundColor цветом bg_color', () => {
    const twa = makeTwa({ themeParams: { bg_color: '#1c1c1d' } })
    applyTelegramTheme(twa)
    expect(twa.setHeaderColor).toHaveBeenCalledWith('#1c1c1d')
    expect(twa.setBackgroundColor).toHaveBeenCalledWith('#1c1c1d')
  })
})
```

- [ ] **Step 3: Запустить — падает**

Run: `pnpm -C frontend test -- src/lib/telegram-theme.test.ts`
Expected: FAIL — модуль не существует.

- [ ] **Step 4: Реализация**

Создать `frontend/src/lib/telegram-theme.ts`:

```ts
import type { TelegramWebApp } from './telegram'

const THEME_VAR_MAP: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['bg_color', ['--background']],
  [
    'text_color',
    [
      '--foreground',
      '--card-foreground',
      '--popover-foreground',
      '--secondary-foreground',
      '--accent-foreground',
    ],
  ],
  ['section_bg_color', ['--card', '--popover']],
  ['secondary_bg_color', ['--secondary', '--muted', '--accent']],
  ['hint_color', ['--muted-foreground']],
  ['button_color', ['--primary', '--ring']],
  ['button_text_color', ['--primary-foreground']],
  ['destructive_text_color', ['--destructive']],
  ['section_separator_color', ['--border', '--input']],
]

export function applyTelegramTheme(twa: TelegramWebApp): void {
  const root = document.documentElement
  for (const [param, cssVars] of THEME_VAR_MAP) {
    const value = twa.themeParams[param]
    if (!value) continue
    for (const cssVar of cssVars) root.style.setProperty(cssVar, value)
  }
  root.classList.toggle('dark', twa.colorScheme === 'dark')
  const bg = twa.themeParams['bg_color']
  if (bg) {
    twa.setHeaderColor(bg)
    twa.setBackgroundColor(bg)
  }
}
```

- [ ] **Step 5: Тесты зелёные**

Run: `pnpm -C frontend test -- src/lib/telegram-theme.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 6: Подключить в useTelegramInit**

В `frontend/src/hooks/useTelegramInit.ts`:

```ts
import { applyTelegramTheme } from '@/lib/telegram-theme'
```

В `useEffect` после `app.expand()`:

```ts
applyTelegramTheme(app)
const onThemeChanged = () => applyTelegramTheme(app)
app.onEvent('themeChanged', onThemeChanged)
```

И добавить cleanup в конец эффекта (сейчас эффект без return):

```ts
return () => {
  app.offEvent('themeChanged', onThemeChanged)
}
```

Важно: cleanup должен возвращаться только в ветке Mini App (после раннего `if (!isMA) return` это уже так).

- [ ] **Step 7: Полная проверка**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок TS, все тесты проходят.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/telegram-theme.ts frontend/src/lib/telegram-theme.test.ts frontend/src/lib/telegram.ts frontend/src/hooks/useTelegramInit.ts
git commit -m "feat(miniapp): apply tg theme params to css vars, header and background colors"
```

---

### Task 8: Замена hardcoded-серой палитры на семантические токены

Компоненты используют `bg-white`, `text-gray-*`, `border-gray-*` — в тёмной теме Telegram они останутся светлыми. Механическая замена на shadcn-токены (которые с Task 7 следуют `--tg-theme-*`). Цветные акценты (`bg-blue-100`, `bg-amber-*`, `text-white` на цветном фоне и т.п.) НЕ трогаем — фиксируем как известное ограничение в QA-чеклисте.

**Files:**

- Modify: ~29 файлов в `frontend/src/components/` и `frontend/src/app/` (механически)

- [ ] **Step 1: Выполнить замены**

Таблица замен:

| Было              | Стало                   |
| ----------------- | ----------------------- |
| `bg-white`        | `bg-card`               |
| `text-gray-900`   | `text-card-foreground`  |
| `text-gray-800`   | `text-foreground`       |
| `text-gray-700`   | `text-foreground`       |
| `text-gray-600`   | `text-muted-foreground` |
| `text-gray-500`   | `text-muted-foreground` |
| `text-gray-400`   | `text-muted-foreground` |
| `bg-gray-100`     | `bg-muted`              |
| `bg-gray-50`      | `bg-muted`              |
| `border-gray-300` | `border-border`         |
| `border-gray-200` | `border-border`         |

Run (из корня репо, macOS sed):

```bash
find frontend/src -name '*.tsx' -not -name '*.test.tsx' -exec sed -i '' \
  -e 's/bg-white/bg-card/g' \
  -e 's/text-gray-900/text-card-foreground/g' \
  -e 's/text-gray-800/text-foreground/g' \
  -e 's/text-gray-700/text-foreground/g' \
  -e 's/text-gray-600/text-muted-foreground/g' \
  -e 's/text-gray-500/text-muted-foreground/g' \
  -e 's/text-gray-400/text-muted-foreground/g' \
  -e 's/bg-gray-100/bg-muted/g' \
  -e 's/bg-gray-50/bg-muted/g' \
  -e 's/border-gray-300/border-border/g' \
  -e 's/border-gray-200/border-border/g' \
  {} +
```

Замены подстрок автоматически покрывают варианты с префиксами (`hover:bg-gray-50` → `hover:bg-muted`).

- [ ] **Step 2: Проверить остатки**

Run: `grep -rn 'bg-white\|text-gray-[4-9]\|border-gray-[23]00\|bg-gray-\(50\|100\)' frontend/src --include='*.tsx' | grep -v '.test.tsx'`
Expected: пусто (либо только осознанные случаи — например `text-white` не входит в паттерн и остаётся).

- [ ] **Step 3: Тесты и typecheck**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок TS. Если какой-то тест ассертит старый класс (например `bg-white`) — обновить ассерт в тесте на новый токен, это ожидаемое изменение.

- [ ] **Step 4: Визуальная проверка (web)**

Run: `pnpm -C frontend dev`, открыть `http://localhost:3000/vacancies` и `/dashboard/vacancies` в браузере.
Expected: светлая тема выглядит как раньше (в дефолтной light-теме `--card`≈white, `--muted-foreground`≈gray-500).

- [ ] **Step 5: Commit**

```bash
git add -u frontend/src
git commit -m "refactor(ui): replace hardcoded gray palette with semantic theme tokens"
```

---

### Task 9: Backend — canViewApplication (доступ к отклику)

Отклик видят двое: кандидат (`application.user`) и работодатель (`application.vacancy.postedBy`).

**Files:**

- Modify: `backend/src/api/application/services/application-utils.ts`
- Test: `backend/tests/unit/application-utils.test.ts`

- [ ] **Step 1: Написать падающий тест**

В `backend/tests/unit/application-utils.test.ts` дополнить импорт и добавить describe:

```ts
import {
  canTransitionTo,
  STATUS_TRANSITIONS,
  canViewApplication,
} from '../../src/api/application/services/application-utils'
```

```ts
describe('canViewApplication', () => {
  it('кандидат (владелец отклика) имеет доступ', () => {
    expect(canViewApplication({ user: { id: 7 }, vacancy: { postedBy: { id: 2 } } }, 7)).toBe(true)
  })

  it('работодатель (владелец вакансии) имеет доступ', () => {
    expect(canViewApplication({ user: { id: 7 }, vacancy: { postedBy: { id: 2 } } }, 2)).toBe(true)
  })

  it('посторонний пользователь не имеет доступа', () => {
    expect(canViewApplication({ user: { id: 7 }, vacancy: { postedBy: { id: 2 } } }, 99)).toBe(
      false
    )
  })

  it('отсутствующие связи не дают доступ', () => {
    expect(canViewApplication({ user: null, vacancy: null }, 7)).toBe(false)
    expect(canViewApplication({}, 7)).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C backend test -- tests/unit/application-utils.test.ts`
Expected: FAIL — `canViewApplication` не экспортируется.

- [ ] **Step 3: Реализация**

В `backend/src/api/application/services/application-utils.ts` добавить:

```ts
export interface ApplicationAccessView {
  user?: { id: number } | null
  vacancy?: { postedBy?: { id: number } | null } | null
}

export function canViewApplication(application: ApplicationAccessView, userId: number): boolean {
  if (application.user?.id === userId) return true
  if (application.vacancy?.postedBy?.id === userId) return true
  return false
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm -C backend test -- tests/unit/application-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/application/services/application-utils.ts backend/tests/unit/application-utils.test.ts
git commit -m "feat(applications): add canViewApplication access check"
```

---

### Task 10: Backend — GET /applications/:id

**Files:**

- Modify: `backend/src/api/application/routes/application.ts`
- Modify: `backend/src/api/application/controllers/application.ts`

- [ ] **Step 1: Добавить маршрут**

В `backend/src/api/application/routes/application.ts` после блока `POST /applications` добавить:

```ts
    // Candidate or vacancy owner: view single application
    {
      method: 'GET',
      path: '/applications/:id',
      handler: 'application.findOne',
      config: {},
    },
```

- [ ] **Step 2: Добавить контроллер findOne**

В `backend/src/api/application/controllers/application.ts`:

Обновить импорт (строка 2):

```ts
import { canTransitionTo, canViewApplication } from '../services/application-utils'
```

Добавить метод в объект контроллера (после `findMine`, паттерн ответа `{ data }` как у остальных методов):

```ts
  async findOne(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const application = await (strapi.documents as any)('api::application.application').findOne({
      documentId: id,
      populate: APPLICATION_POPULATE as any,
    })
    if (!application) return ctx.notFound('Application not found')
    if (!canViewApplication(application, user.id)) {
      return ctx.forbidden('You do not have access to this application')
    }

    ctx.body = { data: application }
  },
```

Примечание: `APPLICATION_POPULATE` уже включает `vacancy.postedBy.id`, `resume.user.id` и `user.id` — достаточно для проверки доступа и для карточки на фронте.

- [ ] **Step 3: Проверка**

Run: `pnpm -C backend typecheck && pnpm -C backend test`
Expected: 0 ошибок TS, все тесты проходят.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/application/routes/application.ts backend/src/api/application/controllers/application.ts
git commit -m "feat(applications): add GET /applications/:id for candidate and vacancy owner"
```

---

### Task 11: ApplicationStore.fetchApplicationById

**Files:**

- Modify: `frontend/src/stores/ApplicationStore.ts`
- Test: `frontend/src/stores/ApplicationStore.test.ts`

- [ ] **Step 1: Написать падающий тест**

В `frontend/src/stores/ApplicationStore.test.ts` добавить describe (мок `api` уже настроен в файле — использовать существующий паттерн моков этого файла):

```ts
describe('fetchApplicationById', () => {
  it('загружает отклик в currentApplication', async () => {
    const app = { id: 1, documentId: 'app1', status: 'applied' }
    vi.mocked(api.get).mockResolvedValueOnce({ data: app })

    const store = new ApplicationStore()
    await store.fetchApplicationById('app1')

    expect(api.get).toHaveBeenCalledWith('/applications/app1')
    expect(store.currentApplication).toEqual(app)
    expect(store.error).toBeNull()
  })

  it('пишет ошибку и оставляет currentApplication=null при сбое', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Not found'))

    const store = new ApplicationStore()
    await store.fetchApplicationById('nope')

    expect(store.currentApplication).toBeNull()
    expect(store.error).toBe('Not found')
  })
})
```

Если моки в файле оформлены иначе (например `mockApi.get`), адаптировать вызовы к локальному паттерну файла, сохранив ассерты.

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C frontend test -- src/stores/ApplicationStore.test.ts`
Expected: FAIL — `fetchApplicationById` не существует.

- [ ] **Step 3: Реализация**

В `frontend/src/stores/ApplicationStore.ts`:

Добавить поле после `vacancyApplications`:

```ts
  currentApplication: Application | null = null
```

Добавить метод после `fetchMyApplications`:

```ts
  async fetchApplicationById(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.currentApplication = null
    })
    try {
      const res = await api.get<{ data: Application }>(`/applications/${id}`)
      runInAction(() => {
        this.currentApplication = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch application'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm -C frontend test -- src/stores/ApplicationStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/ApplicationStore.ts frontend/src/stores/ApplicationStore.test.ts
git commit -m "feat(applications): fetch single application by documentId in store"
```

---

### Task 12: Страница /dashboard/applications/[id]

**Files:**

- Create: `frontend/src/app/dashboard/applications/[id]/page.tsx`
- Create: `frontend/src/app/dashboard/applications/[id]/ApplicationDetailClient.tsx`
- Test: `frontend/src/app/dashboard/applications/[id]/ApplicationDetailClient.test.tsx`

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/app/dashboard/applications/[id]/ApplicationDetailClient.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ApplicationDetailClient } from './ApplicationDetailClient'

const mockFetch = vi.fn()
const storeState: Record<string, unknown> = {}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
}))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ application: storeState }),
}))

function setStore(overrides: Record<string, unknown>) {
  for (const key of Object.keys(storeState)) delete storeState[key]
  Object.assign(
    storeState,
    { isLoading: false, error: null, currentApplication: null, fetchApplicationById: mockFetch },
    overrides
  )
}

const app = {
  id: 1,
  documentId: 'app1',
  status: 'applied',
  coverLetter: 'Хочу к вам',
  createdAt: '2026-06-01T10:00:00.000Z',
  vacancy: {
    documentId: 'vac1',
    title: 'Frontend Developer',
    status: 'published',
    sourceType: 'internal',
    company: { documentId: 'c1', name: 'Acme Inc', slug: 'acme' },
  },
  resume: {
    documentId: 'res1',
    title: 'Senior Frontend',
    firstName: 'Иван',
    lastName: 'Петров',
    status: 'published',
  },
  user: { id: 7, firstName: 'Иван', lastName: 'Петров' },
}

describe('ApplicationDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('запрашивает отклик по documentId', () => {
    setStore({})
    render(<ApplicationDetailClient documentId="app1" />)
    expect(mockFetch).toHaveBeenCalledWith('app1')
  })

  it('рендерит вакансию, резюме, статус и сопроводительное письмо', () => {
    setStore({ currentApplication: app })
    render(<ApplicationDetailClient documentId="app1" />)
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
    expect(screen.getByText('Acme Inc')).toBeInTheDocument()
    expect(screen.getByText('Senior Frontend')).toBeInTheDocument()
    expect(screen.getByText('Хочу к вам')).toBeInTheDocument()
  })

  it('показывает ошибку', () => {
    setStore({ error: 'Not found' })
    render(<ApplicationDetailClient documentId="app1" />)
    expect(screen.getByText('Not found')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C frontend test -- 'src/app/dashboard/applications/[id]/ApplicationDetailClient.test.tsx'`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализация клиента**

Создать `frontend/src/app/dashboard/applications/[id]/ApplicationDetailClient.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { ApplicationStatusBadge } from '@/components/application/ApplicationStatusBadge'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'

interface Props {
  documentId: string
}

export const ApplicationDetailClient = observer(function ApplicationDetailClient({
  documentId,
}: Props) {
  const { application: store } = useStores()
  useTelegramBackButton()

  useEffect(() => {
    void store.fetchApplicationById(documentId)
  }, [store, documentId])

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (store.error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {store.error}
      </p>
    )
  }

  const app = store.currentApplication
  if (!app) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Отклик</h1>
        <div className="mt-2 flex items-center gap-2">
          <ApplicationStatusBadge status={app.status} />
          <span className="text-xs text-muted-foreground">
            {new Date(app.createdAt).toLocaleDateString('ru', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Вакансия</p>
        <Link
          href={`/vacancies/${app.vacancy.documentId}`}
          className="mt-1 block font-semibold hover:underline"
        >
          {app.vacancy.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted-foreground">{app.vacancy.company.name}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Резюме</p>
        <Link
          href={`/resumes/${app.resume.documentId}`}
          className="mt-1 block font-semibold hover:underline"
        >
          {app.resume.title}
        </Link>
      </div>

      {app.coverLetter && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Сопроводительное письмо</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{app.coverLetter}</p>
        </div>
      )}
    </div>
  )
})
```

- [ ] **Step 4: Создать page.tsx**

Создать `frontend/src/app/dashboard/applications/[id]/page.tsx`:

```tsx
import { ApplicationDetailClient } from './ApplicationDetailClient'

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <ApplicationDetailClient documentId={id} />
    </div>
  )
}
```

Примечание: сверить сигнатуру `params` с существующей страницей `frontend/src/app/dashboard/vacancies/[id]/edit/page.tsx` и использовать тот же паттерн.

- [ ] **Step 5: Тесты зелёные**

Run: `pnpm -C frontend test -- 'src/app/dashboard/applications/[id]/ApplicationDetailClient.test.tsx' && pnpm -C frontend typecheck`
Expected: PASS (3 теста), 0 ошибок TS.

- [ ] **Step 6: Commit**

```bash
git add 'frontend/src/app/dashboard/applications/[id]'
git commit -m "feat(applications): add application detail page for deep links"
```

---

### Task 13: Страница /dashboard/profile

Bottom nav ссылается на `/dashboard/profile` — сейчас это 404.

**Files:**

- Create: `frontend/src/app/dashboard/profile/page.tsx`
- Create: `frontend/src/app/dashboard/profile/ProfileClient.tsx`
- Test: `frontend/src/app/dashboard/profile/ProfileClient.test.tsx`

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/app/dashboard/profile/ProfileClient.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProfileClient } from './ProfileClient'

const mockPush = vi.fn()
const mockLogout = vi.fn()
let mockUser: Record<string, unknown> | null = null

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ auth: { user: mockUser, logout: mockLogout } }),
}))

describe('ProfileClient', () => {
  it('показывает имя, email и план пользователя', () => {
    mockUser = {
      id: 1,
      firstName: 'Иван',
      lastName: 'Петров',
      email: 'ivan@test.com',
      subscriptionPlan: 'free',
      subscriptionExpiresAt: null,
    }
    render(<ProfileClient />)
    expect(screen.getByText('Иван Петров')).toBeInTheDocument()
    expect(screen.getByText('ivan@test.com')).toBeInTheDocument()
  })

  it('рендерит навигационные ссылки', () => {
    render(<ProfileClient />)
    expect(screen.getByText('Мои публикации')).toBeInTheDocument()
    expect(screen.getByText('Подписка')).toBeInTheDocument()
    expect(screen.getByText('Уведомления')).toBeInTheDocument()
  })

  it('кнопка «Выйти» вызывает logout и редирект на главную', () => {
    render(<ProfileClient />)
    fireEvent.click(screen.getByText('Выйти'))
    expect(mockLogout).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('без пользователя показывает приглашение войти', () => {
    mockUser = null
    render(<ProfileClient />)
    expect(screen.getByText('Войдите, чтобы открыть профиль.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C frontend test -- src/app/dashboard/profile/ProfileClient.test.tsx`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализация клиента**

Создать `frontend/src/app/dashboard/profile/ProfileClient.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { Button } from '@/components/ui/button'

const LINKS = [
  { href: '/dashboard/publications', label: 'Мои публикации' },
  { href: '/dashboard/notifications', label: 'Уведомления' },
  { href: '/dashboard/favorites', label: 'Избранное' },
  { href: '/dashboard/saved-searches', label: 'Сохранённые поиски' },
  { href: '/dashboard/blocks', label: 'Блокировки' },
  { href: '/subscription', label: 'Подписка' },
]

export const ProfileClient = observer(function ProfileClient() {
  const { auth } = useStores()
  const router = useRouter()

  const user = auth.user
  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Войдите, чтобы открыть профиль.</p>
        <Button className="mt-4" onClick={() => router.push('/login')}>
          Войти
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {user.firstName} {user.lastName}
        </h1>
        <div className="mt-2">
          <SubscriptionBadge
            plan={user.subscriptionPlan}
            expiresAt={user.subscriptionExpiresAt}
            showExpiry
          />
        </div>
        {user.email && <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>}
      </div>

      <nav className="divide-y divide-border rounded-xl border border-border bg-card">
        {LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className="block px-4 py-3 text-sm hover:bg-muted">
            {label}
          </Link>
        ))}
      </nav>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          auth.logout()
          router.push('/')
        }}
      >
        Выйти
      </Button>
    </div>
  )
})
```

- [ ] **Step 4: Создать page.tsx**

Создать `frontend/src/app/dashboard/profile/page.tsx`:

```tsx
import { ProfileClient } from './ProfileClient'

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <ProfileClient />
    </div>
  )
}
```

- [ ] **Step 5: Тесты зелёные**

Run: `pnpm -C frontend test -- src/app/dashboard/profile/ProfileClient.test.tsx && pnpm -C frontend typecheck`
Expected: PASS (4 теста), 0 ошибок TS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/dashboard/profile
git commit -m "feat(miniapp): add profile page for bottom navigation"
```

---

### Task 14: BackButton на всех вложенных экранах

Точечное подключение (решение пользователя): в каждый клиент-компонент вложенного экрана добавить импорт и вызов хука. `ApplicationDetailClient` уже подключён в Task 12.

**Files (13 файлов):**

- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`
- Modify: `frontend/src/app/companies/[id]/CompanyDetailClient.tsx`
- Modify: `frontend/src/app/resumes/[id]/ResumeDetailClient.tsx`
- Modify: `frontend/src/app/subscription/SubscriptionClient.tsx`
- Modify: `frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.tsx`
- Modify: `frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.tsx`
- Modify: `frontend/src/app/dashboard/vacancies/[id]/analytics/VacancyAnalyticsClient.tsx`
- Modify: `frontend/src/app/dashboard/vacancies/[id]/applications/VacancyApplicationsClient.tsx`
- Modify: `frontend/src/app/dashboard/resumes/new/CreateResumeClient.tsx`
- Modify: `frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx`
- Modify: `frontend/src/app/dashboard/resumes/[id]/analytics/ResumeAnalyticsClient.tsx`
- Modify: `frontend/src/app/dashboard/companies/new/CreateCompanyClient.tsx`
- Modify: `frontend/src/app/dashboard/companies/[id]/edit/EditCompanyClient.tsx`

- [ ] **Step 1: Добавить хук в каждый файл**

В каждом из 13 файлов:

1. Добавить импорт после остальных импортов:

```ts
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
```

2. Первой строкой в теле функции-компонента (до остальных хуков или сразу после `useStores()`):

```ts
useTelegramBackButton()
```

Хук — no-op вне Mini App, поведение web-версии не меняется. Существующие тесты этих клиентов мокают `next/navigation` — если мок не содержит нужного `useRouter`, тесты не сломаются, т.к. `window.Telegram` в jsdom отсутствует и эффект выходит до обращения к `router` (сам `useRouter()` вызывается всегда — проверить, что мок `next/navigation` в упавших тестах экспортирует `useRouter`; при падении добавить `useRouter: () => ({ back: vi.fn(), push: vi.fn() })` в мок теста).

- [ ] **Step 2: Проверка**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок TS, все тесты проходят (при падении — поправить моки `next/navigation` как описано выше).

- [ ] **Step 3: Commit**

```bash
git add -u frontend/src/app
git commit -m "feat(miniapp): wire telegram BackButton on nested screens"
```

---

### Task 15: HapticFeedback на ключевых действиях

Точечно: тактильный отклик на выборе избранного, успешной оплате, успешной отправке на модерацию и успешном отклике.

**Files:**

- Modify: `frontend/src/components/favorite/FavoriteButton.tsx`
- Modify: `frontend/src/hooks/useTelegramPayment.ts`
- Modify: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx`
- Modify: `frontend/src/app/dashboard/resumes/MyResumesClient.tsx`
- Modify: `frontend/src/app/dashboard/companies/MyCompaniesClient.tsx`
- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`

- [ ] **Step 1: FavoriteButton — hapticSelection при переключении**

В `frontend/src/components/favorite/FavoriteButton.tsx`:

```ts
import { hapticSelection } from '@/lib/telegram'
```

Найти обработчик клика (функция, вызывающая `addFavorite`/`removeFavorite` — `grep -n "addFavorite\|removeFavorite" frontend/src/components/favorite/FavoriteButton.tsx`) и добавить `hapticSelection()` первой строкой обработчика.

- [ ] **Step 2: useTelegramPayment — hapticNotify('success') при оплате**

В `frontend/src/hooks/useTelegramPayment.ts`:

```ts
import { getTelegramWebApp, hapticNotify } from '@/lib/telegram'
```

В колбэке `openInvoice` внутри `if (status === 'paid' && onPaid)`:

```ts
if (status === 'paid' && onPaid) {
  hapticNotify('success')
  onPaid()
}
```

- [ ] **Step 3: Успешная отправка на модерацию — hapticNotify('success')**

В трёх файлах (`MyVacanciesClient.tsx`, `MyResumesClient.tsx`, `MyCompaniesClient.tsx`):

```ts
import { hapticNotify } from '@/lib/telegram'
```

В каждом — найти success-ветку publish/submit-обработчика (`grep -n "toast.success" <файл>`) и добавить `hapticNotify('success')` строкой сразу после каждого `toast.success(...)`.

- [ ] **Step 4: Успешный отклик — hapticNotify('success')**

В `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx` — в обработчике успешного `createApplication` (функция `handleApply` или аналог, `grep -n "createApplication" <файл>`) добавить `hapticNotify('success')` сразу после успешного `await`.

- [ ] **Step 5: Проверка**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок TS, все тесты проходят (хелперы — no-op в jsdom без `window.Telegram`).

- [ ] **Step 6: Commit**

```bash
git add -u frontend/src
git commit -m "feat(miniapp): add haptic feedback on key actions"
```

---

### Task 16: MainButton в формах и ApplyDialog

В Mini App MainButton заменяет submit-кнопку формы (кнопка скрывается). Вне Mini App ничего не меняется.

**Files:**

- Modify: `frontend/src/components/company/CompanyForm.tsx`
- Modify: `frontend/src/components/vacancy/VacancyForm.tsx`
- Modify: `frontend/src/components/resume/ResumeForm.tsx`
- Modify: `frontend/src/components/application/ApplyDialog.tsx`
- Test: `frontend/src/components/company/CompanyForm.miniapp.test.tsx` (создать)

- [ ] **Step 1: Написать падающий тест (CompanyForm в Mini App)**

Создать `frontend/src/components/company/CompanyForm.miniapp.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CompanyForm } from './CompanyForm'

function mockTelegramMainButton() {
  const MainButton = {
    text: '',
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    showProgress: vi.fn(),
    hideProgress: vi.fn(),
  }
  ;(window as unknown as { Telegram?: unknown }).Telegram = {
    WebApp: { initData: 'user=1', MainButton },
  }
  return MainButton
}

describe('CompanyForm в Mini App', () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
  })

  it('в Mini App скрывает submit-кнопку и показывает MainButton', async () => {
    const mb = mockTelegramMainButton()
    render(<CompanyForm onSubmit={vi.fn()} />)
    await waitFor(() => expect(mb.show).toHaveBeenCalled())
    expect(mb.text).toBe('Сохранить')
    expect(screen.queryByRole('button', { name: 'Сохранить' })).not.toBeInTheDocument()
  })

  it('вне Mini App submit-кнопка на месте', () => {
    render(<CompanyForm onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm -C frontend test -- src/components/company/CompanyForm.miniapp.test.tsx`
Expected: FAIL — кнопка «Сохранить» рендерится в Mini App-режиме.

- [ ] **Step 3: CompanyForm**

В `frontend/src/components/company/CompanyForm.tsx`:

```ts
import { useTelegramMainButton } from '@/hooks/useTelegramMainButton'
```

В теле компонента после инициализации `useForm` (`handleSubmit` уже деструктурирован):

```ts
const mainButtonActive = useTelegramMainButton({
  text: isLoading ? 'Сохранение...' : 'Сохранить',
  onClick: () => void handleSubmit(onSubmit)(),
  disabled: !!isLoading,
})
```

Submit-кнопку (строка ~130) обернуть:

```tsx
{
  !mainButtonActive && (
    <Button type="submit" className="w-full" disabled={isLoading}>
      {isLoading ? 'Сохранение...' : 'Сохранить'}
    </Button>
  )
}
```

- [ ] **Step 4: VacancyForm**

В `frontend/src/components/vacancy/VacancyForm.tsx` — тот же импорт; в теле компонента (после `useForm`, `handleFormSubmit` объявлен ниже как обычная функция — вызов через стрелку допустим, если `handleFormSubmit` объявлен как `function`; если это `const`, разместить хук ПОСЛЕ объявления `handleFormSubmit`):

```ts
const mainButtonActive = useTelegramMainButton({
  text: isLoading ? 'Сохранение...' : 'Сохранить',
  onClick: () => void handleSubmit(handleFormSubmit)(),
  disabled: !!isLoading,
})
```

Submit-кнопку (строка ~377) обернуть в `{!mainButtonActive && ( ... )}` аналогично Step 3.

- [ ] **Step 5: ResumeForm**

В `frontend/src/components/resume/ResumeForm.tsx` — аналогично Step 4 (обработчик называется `handleFormSubmit`, кнопка на строке ~511):

```ts
const mainButtonActive = useTelegramMainButton({
  text: isLoading ? 'Сохранение...' : 'Сохранить',
  onClick: () => void handleSubmit(handleFormSubmit)(),
  disabled: !!isLoading,
})
```

- [ ] **Step 6: ApplyDialog**

В `frontend/src/components/application/ApplyDialog.tsx` — диалог рендерит `null` при `isOpen=false`, но хуки выполняются всегда, поэтому используем `visible`:

```ts
import { useTelegramMainButton } from '@/hooks/useTelegramMainButton'
```

Перед `if (!isOpen) return null` (строка ~48) добавить (submit-логика выносится выше early return):

```ts
const submit = async () => {
  if (!resumeId) return
  await onSubmit(resumeId, coverLetter)
}

const mainButtonActive = useTelegramMainButton({
  text: isLoading ? 'Отправка...' : 'Откликнуться',
  onClick: () => void submit(),
  disabled: (isLoading ?? false) || !resumeId,
  visible: isOpen && !(limitReached ?? false) && !(alreadyApplied ?? false) && !fetchError,
})

if (!isOpen) return null

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  await submit()
}
```

(существующее объявление `handleSubmit` после early return заменить на приведённое).

Submit-кнопку (строка ~118) обернуть:

```tsx
<div className="flex gap-3">
  {!mainButtonActive && (
    <Button type="submit" disabled={isLoading ?? !resumeId} className="flex-1">
      {isLoading ? 'Отправка...' : 'Откликнуться'}
    </Button>
  )}
  <Button type="button" variant="outline" onClick={onClose}>
    Отмена
  </Button>
</div>
```

- [ ] **Step 7: Тесты зелёные**

Run: `pnpm -C frontend test && pnpm -C frontend typecheck`
Expected: PASS (включая новый miniapp-тест), 0 ошибок TS. Если существующие тесты форм падают из-за скрытой кнопки — они не должны: в jsdom без `window.Telegram` `mainButtonActive === false`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/company frontend/src/components/vacancy/VacancyForm.tsx frontend/src/components/resume/ResumeForm.tsx frontend/src/components/application/ApplyDialog.tsx
git commit -m "feat(miniapp): replace form submit buttons with telegram MainButton"
```

---

### Task 17: QA-чеклист для ручного прогона в Telegram

**Files:**

- Create: `docs/qa/sprint9-miniapp-checklist.md`

- [ ] **Step 1: Создать чеклист**

Создать `docs/qa/sprint9-miniapp-checklist.md`:

```markdown
# Sprint 9 — QA-чеклист Telegram Mini App

Прогнать на трёх платформах: **iOS**, **Android**, **Telegram Desktop**.
Перед прогоном: backend запущен, webhook установлен, Mini App открывается через бота.

## Инициализация и layout

- [ ] Mini App открывается, происходит авто-логин по initData (без формы входа)
- [ ] WebHeader (браузерная шапка) скрыт, снизу — bottom navigation (Вакансии / Избранное / Отклики / Профиль)
- [ ] Все 4 вкладки bottom nav открываются без 404 (включая Профиль)
- [ ] Цвет шапки и фона совпадает с темой Telegram (light)
- [ ] Переключить Telegram в тёмную тему → фон/текст/карточки адаптируются без перезапуска
- [ ] Известное ограничение: цветные бейджи (статусы, планы) остаются светлыми в dark — не баг

## Deep links

- [ ] `https://t.me/<bot>/app?startapp=vacancy_<documentId>` → открывается карточка вакансии
- [ ] `https://t.me/<bot>/app?startapp=application_<documentId>` → открывается деталь отклика
- [ ] `https://t.me/<bot>/app?startapp=subscription` → открывается страница подписки
- [ ] Кнопка из бот-уведомления о новом отклике ведёт на нужный экран

## BackButton

- [ ] Карточка вакансии/резюме/компании: нативная кнопка «назад» есть и возвращает к списку
- [ ] Создание/редактирование вакансии/резюме/компании: «назад» работает
- [ ] Аналитика вакансии/резюме, отклики на вакансию, подписка: «назад» работает
- [ ] На корневых экранах bottom nav кнопки «назад» нет

## MainButton

- [ ] Форма компании/вакансии/резюме: снизу нативная кнопка «Сохранить», обычной кнопки нет
- [ ] MainButton сабмитит форму; при ошибках валидации остаёмся на форме с сообщениями
- [ ] Диалог отклика: MainButton «Откликнуться» появляется при открытии и исчезает при закрытии
- [ ] MainButton неактивна, если у кандидата нет опубликованного резюме

## HapticFeedback (только iOS/Android)

- [ ] Тап по звёздочке избранного — лёгкая вибрация
- [ ] Успешная отправка на модерацию — notification-вибрация
- [ ] Успешный отклик на вакансию — notification-вибрация
- [ ] Успешная оплата — notification-вибрация

## Платежи (Telegram Stars)

- [ ] Покупка подписки открывает нативный invoice через tg.openInvoice
- [ ] После оплаты план обновляется (кнопка «Обновить статус» на /subscription)
- [ ] Покупка vacancy/apply-пакета работает

## Основные флоу (регресс)

- [ ] Поиск вакансий, фильтры, пагинация
- [ ] Отклик на вакансию → отклик виден в «Мои отклики» → деталь отклика открывается
- [ ] Создание вакансии → отправка на модерацию
- [ ] Избранное: добавить/убрать, список избранного
- [ ] Уведомления: список, отметить прочитанным
- [ ] Профиль: данные, план, выход
```

- [ ] **Step 2: Commit**

```bash
git add docs/qa/sprint9-miniapp-checklist.md
git commit -m "docs(qa): add sprint 9 mini app manual test checklist"
```

---

### Task 18: Обновить sprint-plan.md и CLAUDE.md

**Files:**

- Modify: `docs/sprint-plan.md` (строки 309–320)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Отметить чекбоксы Sprint 9 Frontend**

В `docs/sprint-plan.md` отметить `[x]` все пункты раздела Sprint 9 Frontend, КРОМЕ строки 319 (`QA: полный прогон...`) — она отмечается пользователем после ручного прогона по `docs/qa/sprint9-miniapp-checklist.md`. К пункту QA добавить ссылку:

```markdown
- [ ] QA: полный прогон всех флоу внутри Telegram (iOS + Android + Desktop) — чеклист: `docs/qa/sprint9-miniapp-checklist.md`
```

- [ ] **Step 2: Добавить раздел в CLAUDE.md**

После раздела «Выполнено (Sprint 9 Backend — Telegram Mini App)» добавить:

```markdown
Выполнено (Sprint 9 Frontend — Telegram Mini App):

- `layout.tsx` — подключён `telegram-web-app.js` (beforeInteractive); ранее `window.Telegram` не существовал и Mini App-режим не активировался
- `lib/telegram.ts` — `parseStartParam` (deep links vacancy*/application*/subscription), haptic-хелперы (`hapticImpact`, `hapticNotify`, `hapticSelection`), `onEvent`/`offEvent` в типе TelegramWebApp
- `lib/telegram-theme.ts` — `applyTelegramTheme`: маппинг `--tg-theme-*` → shadcn CSS-переменные, класс `.dark` по colorScheme, `setHeaderColor`/`setBackgroundColor`; подписка на `themeChanged` в `useTelegramInit`
- Hardcoded-серая палитра (`bg-white`, `text-gray-*`, `border-gray-*`) заменена на семантические токены (`bg-card`, `text-muted-foreground`, `border-border`...) — тёмная тема Telegram работает; цветные бейджи остаются светлыми (известное ограничение)
- `hooks/useTelegramBackButton.ts` — показывает нативный BackButton, `router.back()`; подключён точечно на 14 вложенных экранах
- `hooks/useTelegramMainButton.ts` — нативный MainButton с `text/disabled/visible`, возвращает `isMiniApp` (форма скрывает свою submit-кнопку); подключён в CompanyForm, VacancyForm, ResumeForm, ApplyDialog
- `components/layout/StartParamRouter.tsx` — обрабатывает `startapp=...` при запуске (router.replace), подключён в AppShell
- HapticFeedback: FavoriteButton (selection), оплата/модерация/отклик (notification success)
- Backend: `GET /applications/:id` (кандидат или владелец вакансии, `canViewApplication` в application-utils) — для deep link `application_{documentId}`
- `stores/ApplicationStore.ts` — `currentApplication` + `fetchApplicationById`
- `app/dashboard/applications/[id]/` — страница детали отклика (вакансия, резюме, статус, письмо)
- `app/dashboard/profile/` — страница профиля для bottom nav (имя, план, навигация, выход); ранее вкладка вела на 404
- QA-чеклист ручного прогона: `docs/qa/sprint9-miniapp-checklist.md` (iOS + Android + Desktop)
```

Обновить строку «Текущий шаг»:

```markdown
Текущий шаг — Sprint 9 завершён (остался ручной QA-прогон по чеклисту). Следующий: Sprint 10 — SEO, Performance & Launch.
```

- [ ] **Step 3: Финальная проверка всего спринта**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test && pnpm -C backend typecheck && pnpm -C backend test`
Expected: 0 ошибок TS в обоих пакетах, все тесты зелёные.

- [ ] **Step 4: Commit**

```bash
git add docs/sprint-plan.md CLAUDE.md
git commit -m "docs: mark Sprint 9 Frontend (Telegram Mini App) as completed"
```

---

## Self-Review

- **Spec coverage** (чеклист `docs/sprint-plan.md:311-320`):
  - Контекст-детектор `isTelegramMiniApp()` — уже был (lib/telegram.ts:57); Mini App-режим реально оживает после Task 1 (скрипт).
  - Адаптация layout (header/toolbar) — уже была (AppShell); профиль-вкладка чинится Task 13.
  - `tg.MainButton` — Tasks 5, 16.
  - `tg.BackButton` — Tasks 4, 12, 14.
  - `tg.HapticFeedback` — Tasks 3, 15.
  - CSS `--tg-theme-*` (light + dark) — Tasks 7, 8.
  - Bottom navigation — была; 404 профиля закрыт Task 13.
  - `tg.openInvoice` — уже был (useTelegramPayment); haptic дополнен Task 15.
  - QA-прогон — Task 17 (чеклист; сам прогон ручной, чекбокс остаётся пользователю).
  - `setHeaderColor`/`setBackgroundColor` — Task 7.
  - Deep link роутинг `start_param` (обязательство из Sprint 9 Backend) — Tasks 2, 6, 9–12.
- **Placeholder scan:** все шаги содержат код/команды; в Tasks 14–15 анchor-инструкции сопровождаются grep-командами для точного позиционирования.
- **Type consistency:** `parseStartParam` (Tasks 2→6), `hapticNotify/hapticSelection` (Tasks 3→15), `useTelegramBackButton` (Tasks 4→12→14), `useTelegramMainButton({ text, onClick, disabled, visible }): boolean` (Tasks 5→16), `canViewApplication` (Tasks 9→10), `fetchApplicationById`/`currentApplication` (Tasks 11→12) — сигнатуры согласованы.
