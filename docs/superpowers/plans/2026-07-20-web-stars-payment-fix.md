# Web Stars Payment Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Починить оплату Telegram Stars из веб-версии GramJob (браузер вне Telegram Mini App), заменив ломающийся `window.open()` fallback на явный UI с deep link + QR-код.

**Architecture:** Backend уже отдаёт готовый `t.me/$...` invoice URL через `createInvoiceLink`. Проблема на фронте: `useTelegramPayment.openInvoice` в веб-режиме вызывает `window.open(url, '_blank')` **после** `await` — браузеры блокируют такой popup, потому что он не является user-initiated. Решение — заменить fallback на модалку с явной ссылкой-кнопкой (нативный `<a target="_blank">` работает всегда) + QR-код для перехода на мобильный Telegram с десктопа.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript strict + `exactOptionalPropertyTypes`, MobX, TailwindCSS 4, shadcn/ui (Dialog), i18next, Vitest, `qrcode` npm-пакет для генерации SVG QR.

**Backend изменений НЕ требует** — все нужные endpoints (`POST /payments/subscribe`, `/payments/vacancy-pack`, `/payments/apply-pack`, `/payments/urgent`, `/payments/top-placement`) уже возвращают `{ invoiceUrl: "https://t.me/$..." }`.

---

## File Structure

**Frontend, изменения:**

- Create: `frontend/src/components/payment/TelegramPaymentDialog.tsx` — модалка с состояниями loading/ready/error, кнопкой «Открыть в Telegram» и QR-кодом.
- Create: `frontend/src/components/payment/TelegramPaymentDialog.test.tsx` — рендер-тесты состояний.
- Create: `frontend/src/hooks/useTelegramPaymentDialog.ts` — новый хук, инкапсулирует state модалки (open/close, URL, error) и определение режима (miniapp vs web).
- Create: `frontend/src/hooks/useTelegramPaymentDialog.test.tsx` — тесты хука.
- Modify: `frontend/src/hooks/useTelegramPayment.ts` — оставить только Mini App путь; веб-fallback переехал в новый хук/диалог. Экспортировать также `isTelegramMiniApp()` helper.
- Modify: `frontend/src/app/subscription/SubscriptionClient.tsx` — использовать новый хук + диалог; убрать `openInvoice(url, cb)` в веб-режиме.
- Modify: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx` — то же самое.
- Modify: `frontend/src/locales/ru/common.json`, `frontend/src/locales/en/common.json` — новые ключи для диалога.
- Modify: `frontend/package.json` — зависимость `qrcode` + `@types/qrcode`.

---

## Task 0: Ветка и проверка исходного состояния

**Files:** —

- [ ] **Step 1: Создать feature-ветку**

```bash
git checkout main
git pull
git checkout -b feat/web-stars-payment-fix
```

- [ ] **Step 2: Прогнать все тесты + typecheck, зафиксировать baseline**

```bash
cd frontend && pnpm typecheck && pnpm test --run
```

Expected: 0 TS ошибок, ≥449 тестов PASS (baseline из CLAUDE.md — Account & UX Batch).

Если что-то красное — остановиться и разобраться до начала работы.

---

## Task 1: Установить и типизировать `qrcode`

**Files:**

- Modify: `frontend/package.json`

- [ ] **Step 1: Установить пакеты**

```bash
cd frontend && pnpm add qrcode && pnpm add -D @types/qrcode
```

- [ ] **Step 2: Проверить typecheck**

```bash
cd frontend && pnpm typecheck
```

Expected: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore(frontend): add qrcode dependency for payment deep link"
```

---

## Task 2: Утилита определения Mini App режима

**Files:**

- Modify: `frontend/src/hooks/useTelegramPayment.ts`

Сейчас `useTelegramPayment.openInvoice` смешивает две ветки. Отделяем детектор режима как отдельный экспорт, чтобы вызывающий код мог решать: «Mini App → нативный invoice, web → показать диалог».

- [ ] **Step 1: Написать failing тест на `isTelegramMiniApp()`**

Create: `frontend/src/hooks/useTelegramPayment.test.tsx`

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isTelegramMiniApp } from './useTelegramPayment'

describe('isTelegramMiniApp', () => {
  const originalTelegram = (globalThis as any).window?.Telegram

  afterEach(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).Telegram = originalTelegram
    }
  })

  it('returns false when window.Telegram is undefined', () => {
    ;(window as any).Telegram = undefined
    expect(isTelegramMiniApp()).toBe(false)
  })

  it('returns false when WebApp exists but openInvoice is missing (older SDK)', () => {
    ;(window as any).Telegram = { WebApp: { initData: 'x' } }
    expect(isTelegramMiniApp()).toBe(false)
  })

  it('returns true when WebApp.openInvoice is available', () => {
    ;(window as any).Telegram = { WebApp: { openInvoice: vi.fn() } }
    expect(isTelegramMiniApp()).toBe(true)
  })
})
```

- [ ] **Step 2: Прогнать тест — должен упасть на «isTelegramMiniApp is not a function»**

```bash
cd frontend && pnpm test --run useTelegramPayment
```

Expected: FAIL — `isTelegramMiniApp is not exported`.

- [ ] **Step 3: Реализовать `isTelegramMiniApp` и упростить `useTelegramPayment`**

Replace: `frontend/src/hooks/useTelegramPayment.ts`

```tsx
'use client'

import { getTelegramWebApp, hapticNotify } from '@/lib/telegram'

export function isTelegramMiniApp(): boolean {
  const webApp = getTelegramWebApp()
  return typeof webApp?.openInvoice === 'function'
}

export function useTelegramPayment() {
  const openInvoiceInMiniApp = (url: string, onPaid?: () => void): void => {
    const webApp = getTelegramWebApp()
    if (!webApp?.openInvoice) {
      throw new Error('openInvoiceInMiniApp called outside Telegram Mini App')
    }
    webApp.openInvoice(url, (status: string) => {
      if (status === 'paid' && onPaid) {
        hapticNotify('success')
        onPaid()
      }
    })
  }

  return { openInvoiceInMiniApp, isMiniApp: isTelegramMiniApp() }
}
```

- [ ] **Step 4: Прогнать тесты**

```bash
cd frontend && pnpm test --run useTelegramPayment
```

Expected: 3/3 PASS.

- [ ] **Step 5: Прогнать полный typecheck**

```bash
cd frontend && pnpm typecheck
```

Expected: 0 ошибок. Если где-то ломается вызов старого `openInvoice(url, cb)` — не чинить сейчас, эти места починим в Task 5 и 6. Если ломается — временно вернуть shim: экспортируем ещё `openInvoice` со старой сигнатурой (deprecated), удалим после Task 6.

Если shim нужен — добавить в `useTelegramPayment.ts`:

```tsx
/** @deprecated Use openInvoiceInMiniApp for miniapp path, showTelegramPaymentDialog for web. */
export function openInvoiceShim(url: string, onPaid?: () => void): void {
  if (typeof window === 'undefined') return
  const webApp = getTelegramWebApp()
  if (webApp?.openInvoice) {
    webApp.openInvoice(url, (s: string) => {
      if (s === 'paid' && onPaid) {
        hapticNotify('success')
        onPaid()
      }
    })
  } else {
    window.open(url, '_blank')
  }
}
```

и через `useTelegramPayment()` вернуть также `openInvoice: openInvoiceShim`. Удалим в Task 7.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useTelegramPayment.ts frontend/src/hooks/useTelegramPayment.test.tsx
git commit -m "refactor(payment): split useTelegramPayment into miniapp + isMiniApp"
```

---

## Task 3: Локализационные ключи

**Files:**

- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`

- [ ] **Step 1: Добавить ключи в RU**

Найти в файле объект верхнего уровня и добавить блок:

```json
"telegramPayment": {
  "title": "Оплата через Telegram",
  "descriptionMiniApp": "Подтвердите оплату в Telegram",
  "descriptionWeb": "Нажмите кнопку, чтобы открыть Telegram и оплатить звёздами",
  "openInTelegram": "Открыть в Telegram",
  "orScanQr": "Или отсканируйте QR-код мобильным Telegram",
  "afterPayment": "После оплаты вернитесь сюда и нажмите «Обновить статус»",
  "loading": "Готовим счёт…",
  "errorTitle": "Не удалось создать счёт",
  "errorRetry": "Попробовать снова",
  "close": "Закрыть",
  "copyLink": "Скопировать ссылку",
  "copied": "Скопировано"
}
```

- [ ] **Step 2: Добавить те же ключи в EN**

```json
"telegramPayment": {
  "title": "Pay with Telegram",
  "descriptionMiniApp": "Confirm payment inside Telegram",
  "descriptionWeb": "Click the button to open Telegram and pay with Stars",
  "openInTelegram": "Open in Telegram",
  "orScanQr": "Or scan the QR code with mobile Telegram",
  "afterPayment": "After paying, return here and press \"Refresh status\"",
  "loading": "Preparing invoice…",
  "errorTitle": "Failed to create invoice",
  "errorRetry": "Try again",
  "close": "Close",
  "copyLink": "Copy link",
  "copied": "Copied"
}
```

- [ ] **Step 3: Typecheck (тест-суита обычно проверяет i18n через типизацию ключей — если проект использует typed keys, поверить, что дополнение не сломало типы)**

```bash
cd frontend && pnpm typecheck
```

Expected: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/locales/ru/common.json frontend/src/locales/en/common.json
git commit -m "feat(i18n): add telegramPayment translation keys"
```

---

## Task 4: Компонент `TelegramPaymentDialog`

**Files:**

- Create: `frontend/src/components/payment/TelegramPaymentDialog.tsx`
- Create: `frontend/src/components/payment/TelegramPaymentDialog.test.tsx`

- [ ] **Step 1: Написать failing тесты**

Create: `frontend/src/components/payment/TelegramPaymentDialog.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TelegramPaymentDialog } from './TelegramPaymentDialog'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n' // используем существующую тестовую i18n конфигурацию проекта

function renderWithI18n(node: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>)
}

describe('TelegramPaymentDialog', () => {
  it('renders loading state', () => {
    renderWithI18n(<TelegramPaymentDialog open={true} state="loading" onOpenChange={() => {}} />)
    expect(screen.getByText(/Готовим счёт|Preparing invoice/i)).toBeInTheDocument()
  })

  it('renders ready state with the open-in-telegram link', () => {
    renderWithI18n(
      <TelegramPaymentDialog
        open={true}
        state="ready"
        invoiceUrl="https://t.me/$test-invoice-hash"
        onOpenChange={() => {}}
      />
    )
    const link = screen.getByRole('link', { name: /Открыть в Telegram|Open in Telegram/i })
    expect(link).toHaveAttribute('href', 'https://t.me/$test-invoice-hash')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders QR code SVG when in ready state', async () => {
    renderWithI18n(
      <TelegramPaymentDialog
        open={true}
        state="ready"
        invoiceUrl="https://t.me/$abc"
        onOpenChange={() => {}}
      />
    )
    await waitFor(() => {
      expect(document.querySelector('svg[data-testid="tg-payment-qr"]')).toBeInTheDocument()
    })
  })

  it('renders error state with retry button', async () => {
    const onRetry = vi.fn()
    renderWithI18n(
      <TelegramPaymentDialog
        open={true}
        state="error"
        errorMessage="Network error"
        onRetry={onRetry}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByText('Network error')).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: /Попробовать снова|Try again/i })
    await userEvent.click(retry)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('copies link to clipboard on copy button click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderWithI18n(
      <TelegramPaymentDialog
        open={true}
        state="ready"
        invoiceUrl="https://t.me/$xyz"
        onOpenChange={() => {}}
      />
    )
    const copyBtn = screen.getByRole('button', { name: /Скопировать|Copy/i })
    await userEvent.click(copyBtn)
    expect(writeText).toHaveBeenCalledWith('https://t.me/$xyz')
  })
})
```

- [ ] **Step 2: Прогнать тест — должен упасть на «TelegramPaymentDialog is not defined»**

```bash
cd frontend && pnpm test --run TelegramPaymentDialog
```

Expected: FAIL.

- [ ] **Step 3: Реализовать `TelegramPaymentDialog`**

Create: `frontend/src/components/payment/TelegramPaymentDialog.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export type TelegramPaymentDialogState = 'loading' | 'ready' | 'error'

export interface TelegramPaymentDialogProps {
  open: boolean
  state: TelegramPaymentDialogState
  invoiceUrl?: string
  errorMessage?: string
  onRetry?: () => void
  onOpenChange: (open: boolean) => void
}

export function TelegramPaymentDialog({
  open,
  state,
  invoiceUrl,
  errorMessage,
  onRetry,
  onOpenChange,
}: TelegramPaymentDialogProps) {
  const { t } = useTranslation()
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (state !== 'ready' || !invoiceUrl) {
      setQrSvg(null)
      return
    }
    let cancelled = false
    QRCode.toString(invoiceUrl, { type: 'svg', margin: 1, width: 220 })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg)
      })
      .catch(() => {
        if (!cancelled) setQrSvg(null)
      })
    return () => {
      cancelled = true
    }
  }, [state, invoiceUrl])

  const handleCopy = async () => {
    if (!invoiceUrl) return
    await navigator.clipboard.writeText(invoiceUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('telegramPayment.title')}</DialogTitle>
          <DialogDescription>
            {state === 'ready' ? t('telegramPayment.descriptionWeb') : ''}
          </DialogDescription>
        </DialogHeader>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('telegramPayment.loading')}</p>
          </div>
        )}

        {state === 'ready' && invoiceUrl && (
          <div className="flex flex-col items-center gap-4 py-2">
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('telegramPayment.openInTelegram')}
            </a>

            {qrSvg && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">{t('telegramPayment.orScanQr')}</p>
                <div
                  className="rounded-md bg-white p-2"
                  // Wrap QRCode SVG string. data-testid attached via a wrapper svg selector in test.
                  dangerouslySetInnerHTML={{
                    __html: qrSvg.replace('<svg', '<svg data-testid="tg-payment-qr"'),
                  }}
                />
              </div>
            )}

            <div className="flex w-full items-center justify-between gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? t('telegramPayment.copied') : t('telegramPayment.copyLink')}
              </Button>
              <p className="text-xs text-muted-foreground">{t('telegramPayment.afterPayment')}</p>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm font-medium text-destructive">
              {t('telegramPayment.errorTitle')}
            </p>
            {errorMessage && <p className="text-xs text-muted-foreground">{errorMessage}</p>}
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                {t('telegramPayment.errorRetry')}
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('telegramPayment.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Прогнать тесты**

```bash
cd frontend && pnpm test --run TelegramPaymentDialog
```

Expected: 5/5 PASS.

Если `@/i18n` не существует под таким импортом — импортировать из фактического пути (проверить `frontend/src/lib/i18n.ts` или где инициализируется i18next).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/payment/TelegramPaymentDialog.tsx frontend/src/components/payment/TelegramPaymentDialog.test.tsx
git commit -m "feat(payment): add TelegramPaymentDialog with deep link + QR"
```

---

## Task 5: Хук `useTelegramPaymentDialog`

Инкапсулирует state диалога, чтобы вызывающие компоненты писали `const pay = useTelegramPaymentDialog()` и вызывали `pay.start(() => api.subscribe(planCode))` — хук сам разберётся с loading/ready/error и, если это Mini App, откроет нативный invoice без диалога.

**Files:**

- Create: `frontend/src/hooks/useTelegramPaymentDialog.ts`
- Create: `frontend/src/hooks/useTelegramPaymentDialog.test.tsx`

- [ ] **Step 1: Написать failing тесты**

Create: `frontend/src/hooks/useTelegramPaymentDialog.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTelegramPaymentDialog } from './useTelegramPaymentDialog'

describe('useTelegramPaymentDialog', () => {
  beforeEach(() => {
    ;(window as any).Telegram = undefined
  })
  afterEach(() => {
    ;(window as any).Telegram = undefined
  })

  it('shows loading, then ready when createInvoice resolves (web mode)', async () => {
    const createInvoice = vi.fn().mockResolvedValue('https://t.me/$abc')
    const { result } = renderHook(() => useTelegramPaymentDialog())

    act(() => {
      result.current.start(createInvoice)
    })
    expect(result.current.state).toBe('loading')
    expect(result.current.open).toBe(true)

    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(result.current.invoiceUrl).toBe('https://t.me/$abc')
  })

  it('shows error state when createInvoice rejects', async () => {
    const createInvoice = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useTelegramPaymentDialog())

    act(() => {
      result.current.start(createInvoice)
    })
    await waitFor(() => expect(result.current.state).toBe('error'))
    expect(result.current.errorMessage).toBe('boom')
  })

  it('opens native invoice in Mini App mode and does not show dialog', async () => {
    const openInvoice = vi.fn()
    ;(window as any).Telegram = { WebApp: { openInvoice } }

    const createInvoice = vi.fn().mockResolvedValue('https://t.me/$xyz')
    const onPaid = vi.fn()
    const { result } = renderHook(() => useTelegramPaymentDialog())

    act(() => {
      result.current.start(createInvoice, onPaid)
    })
    await waitFor(() =>
      expect(openInvoice).toHaveBeenCalledWith('https://t.me/$xyz', expect.any(Function))
    )
    expect(result.current.open).toBe(false)

    // Simulate 'paid' callback
    const cb = openInvoice.mock.calls[0][1]
    cb('paid')
    expect(onPaid).toHaveBeenCalledOnce()
  })

  it('close() resets state', async () => {
    const { result } = renderHook(() => useTelegramPaymentDialog())
    act(() => {
      result.current.start(() => Promise.resolve('https://t.me/$q'))
    })
    await waitFor(() => expect(result.current.state).toBe('ready'))

    act(() => {
      result.current.close()
    })
    expect(result.current.open).toBe(false)
  })
})
```

- [ ] **Step 2: Прогнать тесты — должны упасть на отсутствии хука**

```bash
cd frontend && pnpm test --run useTelegramPaymentDialog
```

Expected: FAIL.

- [ ] **Step 3: Реализовать хук**

Create: `frontend/src/hooks/useTelegramPaymentDialog.ts`

```tsx
'use client'

import { useCallback, useState } from 'react'
import { getTelegramWebApp, hapticNotify } from '@/lib/telegram'
import { isTelegramMiniApp } from './useTelegramPayment'

type State = 'idle' | 'loading' | 'ready' | 'error'

export interface UseTelegramPaymentDialogResult {
  open: boolean
  state: Exclude<State, 'idle'>
  invoiceUrl: string | undefined
  errorMessage: string | undefined
  start: (createInvoice: () => Promise<string>, onPaid?: () => void) => void
  retry: () => void
  close: () => void
}

export function useTelegramPaymentDialog(): UseTelegramPaymentDialogResult {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [invoiceUrl, setInvoiceUrl] = useState<string | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [lastArgs, setLastArgs] = useState<{
    createInvoice: () => Promise<string>
    onPaid?: () => void
  } | null>(null)

  const run = useCallback(async (createInvoice: () => Promise<string>, onPaid?: () => void) => {
    const inMiniApp = isTelegramMiniApp()

    setLastArgs({ createInvoice, ...(onPaid ? { onPaid } : {}) })
    setErrorMessage(undefined)

    if (!inMiniApp) {
      setOpen(true)
      setState('loading')
    }

    try {
      const url = await createInvoice()
      setInvoiceUrl(url)

      if (inMiniApp) {
        const webApp = getTelegramWebApp()
        webApp?.openInvoice?.(url, (status: string) => {
          if (status === 'paid') {
            hapticNotify('success')
            onPaid?.()
          }
        })
        setOpen(false)
        setState('idle')
      } else {
        setState('ready')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
      if (!inMiniApp) {
        setState('error')
      }
    }
  }, [])

  const start = useCallback(
    (createInvoice: () => Promise<string>, onPaid?: () => void) => {
      void run(createInvoice, onPaid)
    },
    [run]
  )

  const retry = useCallback(() => {
    if (lastArgs) void run(lastArgs.createInvoice, lastArgs.onPaid)
  }, [lastArgs, run])

  const close = useCallback(() => {
    setOpen(false)
    setState('idle')
    setInvoiceUrl(undefined)
    setErrorMessage(undefined)
  }, [])

  return {
    open,
    state: state === 'idle' ? 'loading' : state,
    invoiceUrl,
    errorMessage,
    start,
    retry,
    close,
  }
}
```

- [ ] **Step 4: Прогнать тесты**

```bash
cd frontend && pnpm test --run useTelegramPaymentDialog
```

Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useTelegramPaymentDialog.ts frontend/src/hooks/useTelegramPaymentDialog.test.tsx
git commit -m "feat(payment): add useTelegramPaymentDialog hook"
```

---

## Task 6: Подключить в `SubscriptionClient`

**Files:**

- Modify: `frontend/src/app/subscription/SubscriptionClient.tsx`

- [ ] **Step 1: Заменить `useTelegramPayment` на `useTelegramPaymentDialog`**

В начале файла:

```tsx
import { useTelegramPaymentDialog } from '@/hooks/useTelegramPaymentDialog'
import { TelegramPaymentDialog } from '@/components/payment/TelegramPaymentDialog'
```

Удалить импорт `useTelegramPayment`. Заменить в теле компонента:

```tsx
const pay = useTelegramPaymentDialog()
```

вместо `const { openInvoice } = useTelegramPayment()`.

- [ ] **Step 2: Переписать три хендлера**

```tsx
const handleBuyPlan = (planCode: string) => {
  if (!user) {
    router.push('/login')
    return
  }
  setBuyingPlan(planCode)
  setShowRefreshHint(false)
  pay.start(
    async () => {
      const url = await payment.subscribeToPlan(planCode)
      return url
    },
    async () => {
      await auth.fetchMe()
      setShowRefreshHint(false)
    }
  )
  // Диалог сам покажет loading; buyingPlan-состояние можно сбросить сразу
  setBuyingPlan(null)
  setShowRefreshHint(true)
}

const handleBuyVacancyPack = (packageId: number) => {
  if (!user) {
    router.push('/login')
    return
  }
  setBuyingVacancyPack(packageId)
  setShowRefreshHint(false)
  pay.start(
    () => payment.buyVacancyPack(packageId),
    async () => {
      await auth.fetchMe()
      setShowRefreshHint(false)
    }
  )
  setBuyingVacancyPack(null)
  setShowRefreshHint(true)
}

const handleBuyApplyPack = (packageId: number) => {
  if (!user) {
    router.push('/login')
    return
  }
  setBuyingApplyPack(packageId)
  setShowRefreshHint(false)
  pay.start(
    () => payment.buyApplyPack(packageId),
    async () => {
      await auth.fetchMe()
      setShowRefreshHint(false)
    }
  )
  setBuyingApplyPack(null)
  setShowRefreshHint(true)
}
```

- [ ] **Step 3: Добавить рендер диалога в конец JSX (перед закрывающим `</div>`)**

```tsx
<TelegramPaymentDialog
  open={pay.open}
  state={pay.state}
  {...(pay.invoiceUrl ? { invoiceUrl: pay.invoiceUrl } : {})}
  {...(pay.errorMessage ? { errorMessage: pay.errorMessage } : {})}
  onRetry={pay.retry}
  onOpenChange={(v) => (v ? undefined : pay.close())}
/>
```

Обрати внимание на conditional spread — CLAUDE.md явно требует его из-за `exactOptionalPropertyTypes: true`.

- [ ] **Step 4: Прогнать typecheck и относящиеся тесты**

```bash
cd frontend && pnpm typecheck && pnpm test --run subscription
```

Expected: 0 TS ошибок, тесты SubscriptionClient (если они есть) PASS. Если тесты падают на моке `useTelegramPayment` — обновить моки на `useTelegramPaymentDialog`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/subscription/SubscriptionClient.tsx
git commit -m "feat(subscription): use dialog-based payment flow for web"
```

---

## Task 7: Подключить в `MyVacanciesClient` (urgent + top placement)

**Files:**

- Modify: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx`

Здесь та же схема, что и в Task 6, но для `payment.buyUrgent(vacancyId)` и `payment.buyTopPlacement(vacancyId)` (проверить точные имена в PaymentStore).

- [ ] **Step 1: Прочитать текущий файл, найти оба вызова `openInvoice`**

```bash
grep -n "openInvoice\|useTelegramPayment" /Users/vitaly/work/GramJob/frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx
```

- [ ] **Step 2: Заменить импорт и хук на `useTelegramPaymentDialog` + `TelegramPaymentDialog`, аналогично Task 6**

Импорты:

```tsx
import { useTelegramPaymentDialog } from '@/hooks/useTelegramPaymentDialog'
import { TelegramPaymentDialog } from '@/components/payment/TelegramPaymentDialog'
```

Заменить:

```tsx
const pay = useTelegramPaymentDialog()
```

- [ ] **Step 3: Переписать хендлеры urgent/top под `pay.start(...)`**

Пример для urgent (адаптировать имена под фактические):

```tsx
const handleBuyUrgent = (vacancyDocumentId: string) => {
  pay.start(
    () => payment.buyUrgent(vacancyDocumentId),
    () => {
      void vacancy.fetchMyVacancies()
    }
  )
}
```

Аналогично для top placement.

- [ ] **Step 4: Добавить `<TelegramPaymentDialog ... />` в конец JSX**

Скопировать блок из Task 6 Step 3.

- [ ] **Step 5: Убрать deprecated shim из useTelegramPayment (если был)**

Если в Task 2 Step 5 был shim — теперь его никто не использует. Удалить экспорт `openInvoiceShim` и `openInvoice: openInvoiceShim` из возвращаемого объекта.

- [ ] **Step 6: Typecheck + все тесты**

```bash
cd frontend && pnpm typecheck && pnpm test --run
```

Expected: 0 TS ошибок, все существующие тесты PASS + новые тесты Task 4 и Task 5 (5+4=9 новых).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx frontend/src/hooks/useTelegramPayment.ts
git commit -m "feat(vacancy): use dialog-based payment for urgent/top placement"
```

---

## Task 8: Ручная проверка (verification before completion)

**Files:** —

Автотесты не покрывают реальный deep link в Telegram. Обязательный ручной прогон.

- [ ] **Step 1: Запустить frontend локально**

```bash
cd frontend && pnpm dev
```

- [ ] **Step 2: Проверка в Chrome (или Firefox) на десктопе**

1. Открыть `http://localhost:3000/subscription`
2. Залогиниться (email/пароль)
3. Кликнуть «Купить Pro»
4. Ожидание: появляется модалка с состоянием loading, потом — с кнопкой «Открыть в Telegram» + QR-код + кнопка «Скопировать ссылку»
5. Кликнуть «Открыть в Telegram»
6. Ожидание: браузер открывает `https://t.me/$...` в новой вкладке, Telegram Desktop (если установлен) перехватывает URL и показывает диалог оплаты; иначе — `web.telegram.org` предлагает войти
7. Отсканировать QR мобильным Telegram: должен открыться invoice в мобильном приложении

- [ ] **Step 3: Проверка Mini App**

1. Открыть mini app через реального бота (`@gramjob_bot` в Telegram)
2. Перейти в раздел «Подписка»
3. Кликнуть «Купить Pro»
4. Ожидание: диалог **не** показывается, сразу открывается нативный Telegram invoice popup
5. После «оплаты» (можно отменить) вернуться в mini app: hint «Обновить статус» появляется

- [ ] **Step 4: Проверка мобильного браузера (Safari iOS / Chrome Android)**

1. Открыть `https://gramjob.com/subscription` (или staging) с мобильного
2. Кликнуть «Купить Pro»
3. Кликнуть «Открыть в Telegram» в модалке
4. Ожидание: система открывает нативный Telegram, показывает invoice

- [ ] **Step 5: Проверка «нет popup blocker» edge case**

1. В Chrome включить `chrome://settings/content/popups` = «Не разрешать»
2. Кликнуть «Купить Pro»
3. Ожидание: **модалка всё равно открывается**, потому что мы **не** используем `window.open`. Ссылка внутри модалки — обычный `<a>`, popup blocker её не трогает.

- [ ] **Step 6: Если все 5 сценариев зелёные — записать результат в PR-описание**

Если что-то падает — вернуться к соответствующему таску.

---

## Task 9: Финальный typecheck, тесты, PR

**Files:** —

- [ ] **Step 1: Полный прогон**

```bash
cd frontend && pnpm typecheck && pnpm test --run && pnpm lint
```

Expected: 0 ошибок, все тесты PASS (baseline 449 + 9 новых = 458 или больше в зависимости от других изменений).

- [ ] **Step 2: Пуш ветки**

```bash
git push -u origin feat/web-stars-payment-fix
```

- [ ] **Step 3: Создать PR через `gh pr create`**

Тело PR:

```markdown
## Summary

- Web-версия теперь показывает модалку с кнопкой «Открыть в Telegram» + QR-кодом вместо ломающегося `window.open()`.
- Mini App-режим не изменился: по-прежнему нативный `WebApp.openInvoice`.
- Затрагивает оплату подписки, vacancy-пакетов, apply-пакетов, urgent, top placement.

## Test plan

- [x] Unit: 9 новых тестов (TelegramPaymentDialog + useTelegramPaymentDialog)
- [ ] Ручное: Chrome desktop → модалка → deep link → Telegram Desktop / web.telegram.org
- [ ] Ручное: Mini App → нативный invoice без модалки
- [ ] Ручное: iOS Safari / Android Chrome → deep link → мобильный Telegram
- [ ] Ручное: браузер с блокировкой popup → модалка открывается, `<a>` работает
```

---

## Self-Review Checklist

**Coverage:**

- Проблема «popup blocker при `window.open` после await» → Task 4 + 5 (диалог, ссылка `<a>` внутри)
- Проблема «пользователь не понимает, что делать» → Task 4 (описание в модалке, QR-код, кнопка копирования)
- Мобильный переход десктоп → телефон → Task 4 (QR-код)
- Сохранить работу Mini App → Task 2, Task 5 (isTelegramMiniApp разветвляет флоу)
- Переиспользуемость → все 5 endpoint'ов (subscribe/vacancy-pack/apply-pack/urgent/top-placement) идут через один хук

**No placeholders:** проверено, весь код показан.

**Type consistency:** `TelegramPaymentDialogProps.state` — union `'loading' | 'ready' | 'error'`, тот же тип возвращает хук как `state`. `invoiceUrl` — везде `string | undefined`. Совпадает.

**Что явно НЕ входит в этот план:** изменения на бэкенде (не нужны), TON Connect (отдельный план), новые платёжные провайдеры (не нужны), редизайн /subscription (за пределами скоупа).
