# Forgot Password Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полный флоу восстановления пароля: страница `/forgot-password` (запрос письма), страница `/reset-password` (новый пароль + авто-логин), ссылка «Забыли пароль?» на логине, SMTP-провайдер для Strapi.

**Architecture:** Используем штатные endpoint-ы Strapi users-permissions (`POST /auth/forgot-password`, `POST /auth/reset-password`) — они уже открыты в PUBLIC_PERMISSIONS. Бэкенд-работа — только конфигурация: nodemailer-провайдер, URL страницы сброса в advanced settings (программно в bootstrap), Mailpit для локальной разработки. Frontend — две страницы в группе `(auth)` по образцу login/register + два метода в AuthStore.

**Tech Stack:** Strapi 5, @strapi/provider-email-nodemailer, Mailpit (dev SMTP), Next.js 15, MobX, React Hook Form + Zod, Vitest + Testing Library (frontend), Jest (backend).

**Spec:** `docs/superpowers/specs/2026-07-10-forgot-password-design.md`

---

## Структура файлов

| Файл                                                                                   | Ответственность                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `docker-compose.yml` (modify)                                                          | Сервис Mailpit (SMTP :1025, web UI :8025)                           |
| `backend/.env.example` (modify)                                                        | SMTP\_\* и EMAIL_FROM переменные                                    |
| `backend/config/plugins.ts` (modify)                                                   | Конфиг email-провайдера nodemailer                                  |
| `backend/src/scripts/setup-password-reset.ts` (create)                                 | Idempotent установка `email_reset_password` URL в advanced settings |
| `backend/tests/unit/setup-password-reset.test.ts` (create)                             | Тесты установки URL                                                 |
| `backend/src/index.ts` (modify)                                                        | Вызов `configurePasswordReset` в bootstrap                          |
| `frontend/src/locales/ru/common.json`, `en/common.json` (modify)                       | Ключи `auth.*` + `apiErrors.*`                                      |
| `frontend/src/services/api.ts` (modify)                                                | Маппинг ошибки `Incorrect code provided`                            |
| `frontend/src/stores/AuthStore.ts` (modify)                                            | Методы `forgotPassword`, `resetPassword`                            |
| `frontend/src/stores/AuthStore.test.ts` (modify)                                       | Тесты новых методов                                                 |
| `frontend/src/app/(auth)/forgot-password/ForgotPasswordCard.tsx` + `page.tsx` (create) | Форма запроса письма + success-state                                |
| `frontend/src/app/(auth)/forgot-password/ForgotPasswordCard.test.tsx` (create)         | Тесты формы                                                         |
| `frontend/src/app/(auth)/reset-password/ResetPasswordCard.tsx` + `page.tsx` (create)   | Форма нового пароля, code из query, авто-логин                      |
| `frontend/src/app/(auth)/reset-password/ResetPasswordCard.test.tsx` (create)           | Тесты формы                                                         |
| `frontend/src/components/auth/EmailLoginForm.tsx` (modify)                             | Ссылка «Забыли пароль?»                                             |
| `frontend/src/components/auth/EmailLoginForm.test.tsx` (create)                        | Тест ссылки                                                         |

---

### Task 1: Mailpit в docker-compose + SMTP env

**Files:**

- Modify: `docker-compose.yml`
- Modify: `backend/.env.example`

- [ ] **Step 1: Добавить сервис Mailpit**

В `docker-compose.yml` после сервиса `minio` добавить:

```yaml
mailpit:
  image: axllent/mailpit:latest
  container_name: gramjob_mailpit
  ports:
    - '1025:1025'
    - '8025:8025'
```

- [ ] **Step 2: Добавить SMTP-переменные в .env.example**

В конец `backend/.env.example` добавить:

```bash
# ============================================
# EMAIL (SMTP)
# Local dev: Mailpit из docker-compose (web UI: http://localhost:8025)
# ============================================
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@gramjob.com
```

Те же переменные добавить в локальный `backend/.env` (не коммитится).

- [ ] **Step 3: Проверить запуск Mailpit**

Run: `docker compose up -d mailpit && curl -s -o /dev/null -w "%{http_code}" http://localhost:8025`
Expected: `200`

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml backend/.env.example
git commit -m "chore: add Mailpit dev SMTP service and email env vars"
```

---

### Task 2: Email-провайдер nodemailer в Strapi

**Files:**

- Modify: `backend/package.json` (зависимость)
- Modify: `backend/config/plugins.ts`

- [ ] **Step 1: Установить провайдер**

Run (из `backend/`): `pnpm add @strapi/provider-email-nodemailer`
Expected: пакет добавлен в dependencies без ошибок.

- [ ] **Step 2: Добавить email-конфиг**

В `backend/config/plugins.ts` в возвращаемый объект (после блока `'users-permissions'`) добавить:

```ts
  email: {
    config: {
      provider: '@strapi/provider-email-nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'localhost'),
        port: env.int('SMTP_PORT', 1025),
        secure: env.bool('SMTP_SECURE', false),
        ...(env('SMTP_USER')
          ? { auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') } }
          : {}),
      },
      settings: {
        defaultFrom: env('EMAIL_FROM', 'noreply@gramjob.com'),
        defaultReplyTo: env('EMAIL_FROM', 'noreply@gramjob.com'),
      },
    },
  },
```

Примечание: `auth` добавляется conditional spread-ом — Mailpit не требует авторизации, а nodemailer с пустым `auth.user` падает.

- [ ] **Step 3: Проверить типы и запуск**

Run (из `backend/`): `pnpm typecheck && pnpm develop` (остановить после успешного старта, Ctrl+C)
Expected: 0 ошибок TypeScript, Strapi стартует без ошибок email-провайдера.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json pnpm-lock.yaml backend/config/plugins.ts
git commit -m "feat(backend): configure nodemailer email provider via SMTP env"
```

---

### Task 3: URL страницы сброса в advanced settings (bootstrap)

Strapi берёт базовый URL ссылки в письме из `email_reset_password` в plugin store `users-permissions` / key `advanced` и добавляет `?code=<token>`. Задаём его программно, чтобы не зависеть от ручной настройки admin-панели.

**Files:**

- Create: `backend/src/scripts/setup-password-reset.ts`
- Create: `backend/tests/unit/setup-password-reset.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Написать падающие тесты**

`backend/tests/unit/setup-password-reset.test.ts`:

```ts
import { configurePasswordReset } from '../../src/scripts/setup-password-reset'

function makeStrapi(advanced: Record<string, unknown> | null) {
  const set = jest.fn()
  const get = jest.fn().mockResolvedValue(advanced)
  const strapi = {
    store: jest.fn().mockReturnValue({ get, set }),
    log: { info: jest.fn(), warn: jest.fn() },
  }
  return { strapi, set }
}

describe('configurePasswordReset', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV, FRONTEND_URL: 'http://localhost:3000' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('устанавливает email_reset_password из FRONTEND_URL, сохраняя остальные настройки', async () => {
    const { strapi, set } = makeStrapi({ email_confirmation: false })
    await configurePasswordReset(strapi as never)
    expect(set).toHaveBeenCalledWith({
      key: 'advanced',
      value: {
        email_confirmation: false,
        email_reset_password: 'http://localhost:3000/reset-password',
      },
    })
  })

  it('idempotent: не пишет, если URL уже установлен', async () => {
    const { strapi, set } = makeStrapi({
      email_reset_password: 'http://localhost:3000/reset-password',
    })
    await configurePasswordReset(strapi as never)
    expect(set).not.toHaveBeenCalled()
  })

  it('срезает завершающий слэш FRONTEND_URL', async () => {
    process.env.FRONTEND_URL = 'https://gramjob.com/'
    const { strapi, set } = makeStrapi({})
    await configurePasswordReset(strapi as never)
    expect(set).toHaveBeenCalledWith({
      key: 'advanced',
      value: { email_reset_password: 'https://gramjob.com/reset-password' },
    })
  })

  it('warn и выход, если FRONTEND_URL не задан', async () => {
    delete process.env.FRONTEND_URL
    const { strapi, set } = makeStrapi({})
    await configurePasswordReset(strapi as never)
    expect(set).not.toHaveBeenCalled()
    expect(strapi.log.warn).toHaveBeenCalled()
  })

  it('работает при отсутствии сохранённых advanced settings (null)', async () => {
    const { strapi, set } = makeStrapi(null)
    await configurePasswordReset(strapi as never)
    expect(set).toHaveBeenCalledWith({
      key: 'advanced',
      value: { email_reset_password: 'http://localhost:3000/reset-password' },
    })
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run (из `backend/`): `pnpm test -- setup-password-reset`
Expected: FAIL — `Cannot find module '../../src/scripts/setup-password-reset'`

- [ ] **Step 3: Реализация**

`backend/src/scripts/setup-password-reset.ts`:

```ts
import type { Core } from '@strapi/strapi'

export async function configurePasswordReset(strapi: Core.Strapi): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL
  if (!frontendUrl) {
    strapi.log.warn('[auth] FRONTEND_URL not set — reset password URL not configured')
    return
  }

  const url = `${frontendUrl.replace(/\/$/, '')}/reset-password`
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' })
  const advanced = ((await store.get({ key: 'advanced' })) ?? {}) as Record<string, unknown>

  if (advanced.email_reset_password === url) return

  await store.set({ key: 'advanced', value: { ...advanced, email_reset_password: url } })
  strapi.log.info(`[auth] Reset password URL set to ${url}`)
}
```

- [ ] **Step 4: Прогнать тесты**

Run (из `backend/`): `pnpm test -- setup-password-reset`
Expected: PASS (5 тестов)

- [ ] **Step 5: Подключить в bootstrap**

В `backend/src/index.ts`:

```ts
import { configurePasswordReset } from './scripts/setup-password-reset'
```

и в `bootstrap` после `await seedPermissions(strapi)`:

```ts
await configurePasswordReset(strapi)
```

- [ ] **Step 6: Полная проверка backend**

Run (из `backend/`): `pnpm test && pnpm typecheck`
Expected: все тесты PASS, 0 ошибок TS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/scripts/setup-password-reset.ts backend/tests/unit/setup-password-reset.test.ts backend/src/index.ts
git commit -m "feat(backend): set reset-password URL in users-permissions advanced settings on bootstrap"
```

---

### Task 4: Локали и маппинг API-ошибки

**Files:**

- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Добавить ключи в ru/common.json**

В секцию `"auth"` (после `"telegramUnavailableLocalhost"`, до `"validation"`) добавить:

```json
"forgotPassword": "Забыли пароль?",
"forgotPasswordTitle": "Восстановление пароля",
"forgotPasswordDescription": "Укажите email — мы отправим ссылку для сброса пароля",
"sendResetLink": "Отправить ссылку",
"resetEmailSent": "Если аккаунт с таким email существует, мы отправили письмо со ссылкой для сброса пароля. Проверьте почту.",
"backToLogin": "Вернуться ко входу",
"resetPasswordTitle": "Новый пароль",
"resetPasswordDescription": "Придумайте новый пароль для входа",
"newPassword": "Новый пароль",
"setNewPassword": "Сохранить пароль",
"resetMissingCode": "Ссылка недействительна: отсутствует код сброса.",
"requestNewLink": "Запросить новую ссылку",
```

В секцию `"apiErrors"` добавить:

```json
"Incorrect code provided": "Ссылка недействительна или устарела",
```

- [ ] **Step 2: Добавить ключи в en/common.json**

В секцию `"auth"` (та же позиция):

```json
"forgotPassword": "Forgot password?",
"forgotPasswordTitle": "Password recovery",
"forgotPasswordDescription": "Enter your email and we will send you a reset link",
"sendResetLink": "Send reset link",
"resetEmailSent": "If an account with this email exists, we have sent a password reset link. Check your inbox.",
"backToLogin": "Back to login",
"resetPasswordTitle": "New password",
"resetPasswordDescription": "Choose a new password for your account",
"newPassword": "New password",
"setNewPassword": "Save password",
"resetMissingCode": "The link is invalid: reset code is missing.",
"requestNewLink": "Request a new link",
```

В секцию `"apiErrors"`:

```json
"Incorrect code provided": "The link is invalid or has expired",
```

- [ ] **Step 3: Добавить маппинг ошибки в api.ts**

В `frontend/src/services/api.ts` в `API_ERROR_I18N_KEYS` добавить:

```ts
'Incorrect code provided': 'apiErrors.Incorrect code provided',
```

- [ ] **Step 4: Проверка**

Run (из `frontend/`): `pnpm test && pnpm typecheck`
Expected: все тесты PASS (локали валидный JSON), 0 ошибок TS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/locales/ru/common.json frontend/src/locales/en/common.json frontend/src/services/api.ts
git commit -m "feat(frontend): add forgot/reset password locale keys and error mapping"
```

---

### Task 5: AuthStore.forgotPassword + resetPassword

**Files:**

- Modify: `frontend/src/stores/AuthStore.ts`
- Modify: `frontend/src/stores/AuthStore.test.ts`

- [ ] **Step 1: Написать падающие тесты**

В `frontend/src/stores/AuthStore.test.ts` добавить (в конец существующего `describe('AuthStore')`, используя уже настроенные моки `api`/`setAuthToken`):

```ts
describe('forgotPassword', () => {
  it('вызывает POST /auth/forgot-password с email', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ ok: true })
    const store = new AuthStore()
    await store.forgotPassword('user@test.com')
    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@test.com' })
    expect(store.error).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('сохраняет ошибку и пробрасывает исключение', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Too Many Requests'))
    const store = new AuthStore()
    await expect(store.forgotPassword('user@test.com')).rejects.toThrow()
    expect(store.error).toBe('Too Many Requests')
    expect(store.isLoading).toBe(false)
  })
})

describe('resetPassword', () => {
  const authResponse = {
    jwt: 'new-jwt',
    user: { id: 1, email: 'user@test.com' },
  }

  it('вызывает POST /auth/reset-password и устанавливает сессию', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(authResponse)
    const store = new AuthStore()
    await store.resetPassword('code123', 'newpass1', 'newpass1')
    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
      code: 'code123',
      password: 'newpass1',
      passwordConfirmation: 'newpass1',
    })
    expect(store.jwt).toBe('new-jwt')
    expect(store.user).toEqual(authResponse.user)
    expect(setAuthToken).toHaveBeenCalledWith('new-jwt')
    expect(localStorage.getItem('gramjob_jwt')).toBe('new-jwt')
  })

  it('сохраняет ошибку при невалидном коде и пробрасывает исключение', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiClientError(400, {}, 'Ссылка недействительна или устарела')
    )
    const store = new AuthStore()
    await expect(store.resetPassword('bad', 'newpass1', 'newpass1')).rejects.toThrow()
    expect(store.error).toBe('Ссылка недействительна или устарела')
    expect(store.jwt).toBeNull()
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run (из `frontend/`): `pnpm test -- AuthStore`
Expected: FAIL — `store.forgotPassword is not a function`

- [ ] **Step 3: Реализация методов**

В `frontend/src/stores/AuthStore.ts` после `loginWithEmail` добавить:

```ts
  async forgotPassword(email: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.post('/auth/forgot-password', { email })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Request failed'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async resetPassword(
    code: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<AuthResponse>('/auth/reset-password', {
        code,
        password,
        passwordConfirmation,
      })
      this._setSession(res.jwt, res.user)
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Reset failed'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
```

- [ ] **Step 4: Прогнать тесты**

Run (из `frontend/`): `pnpm test -- AuthStore`
Expected: PASS (все, включая 4 новых)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/AuthStore.ts frontend/src/stores/AuthStore.test.ts
git commit -m "feat(frontend): add forgotPassword and resetPassword to AuthStore"
```

---

### Task 6: Страница /forgot-password

**Files:**

- Create: `frontend/src/app/(auth)/forgot-password/ForgotPasswordCard.tsx`
- Create: `frontend/src/app/(auth)/forgot-password/ForgotPasswordCard.test.tsx`
- Create: `frontend/src/app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/app/(auth)/forgot-password/ForgotPasswordCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockAuth = {
  forgotPassword: vi.fn(),
  isLoading: false,
  error: null as string | null,
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ auth: mockAuth }),
}))

import { ForgotPasswordCard } from './ForgotPasswordCard'

describe('ForgotPasswordCard', () => {
  beforeEach(() => {
    mockAuth.forgotPassword.mockReset().mockResolvedValue(undefined)
    mockAuth.error = null
  })

  it('рендерит поле email и кнопку отправки', () => {
    render(<ForgotPasswordCard />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отправить ссылку' })).toBeInTheDocument()
  })

  it('показывает ошибку валидации при некорректном email', async () => {
    render(<ForgotPasswordCard />)
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }))
    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument()
    expect(mockAuth.forgotPassword).not.toHaveBeenCalled()
  })

  it('вызывает forgotPassword и показывает success-сообщение', async () => {
    render(<ForgotPasswordCard />)
    await userEvent.type(screen.getByLabelText('Email'), 'user@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }))
    expect(mockAuth.forgotPassword).toHaveBeenCalledWith('user@test.com')
    expect(await screen.findByText(/мы отправили письмо/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).toBeNull()
  })

  it('не показывает success-сообщение при ошибке запроса', async () => {
    mockAuth.forgotPassword.mockRejectedValueOnce(new Error('fail'))
    render(<ForgotPasswordCard />)
    await userEvent.type(screen.getByLabelText('Email'), 'user@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }))
    expect(screen.queryByText(/мы отправили письмо/)).toBeNull()
  })

  it('содержит ссылку «Вернуться ко входу» на /login', () => {
    render(<ForgotPasswordCard />)
    const link = screen.getByRole('link', { name: 'Вернуться ко входу' })
    expect(link.getAttribute('href')).toBe('/login')
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run (из `frontend/`): `pnpm test -- ForgotPasswordCard`
Expected: FAIL — модуль `./ForgotPasswordCard` не найден.

- [ ] **Step 3: Реализация компонента**

`frontend/src/app/(auth)/forgot-password/ForgotPasswordCard.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

// Static schema for type inference only
const _baseSchema = z.object({
  email: z.string().email(),
})

type FormData = z.infer<typeof _baseSchema>

export const ForgotPasswordCard = observer(function ForgotPasswordCard() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const [sent, setSent] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.validation.invalidEmail')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await auth.forgotPassword(data.email)
      setSent(true)
    } catch {
      // error сохранён в auth.error
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl">{t('auth.forgotPasswordTitle')}</CardTitle>
        <CardDescription>{t('auth.forgotPasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">{t('auth.resetEmailSent')}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            {auth.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {auth.error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={auth.isLoading}>
              {auth.isLoading ? t('common.loading') : t('auth.sendResetLink')}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link href="/login" className="underline hover:no-underline">
          {t('auth.backToLogin')}
        </Link>
      </CardFooter>
    </Card>
  )
})
```

- [ ] **Step 4: Создать page.tsx**

`frontend/src/app/(auth)/forgot-password/page.tsx`:

```tsx
import { ForgotPasswordCard } from './ForgotPasswordCard'

export default function ForgotPasswordPage() {
  return (
    <div className="flex justify-center p-4 pt-12 sm:pt-16">
      <ForgotPasswordCard />
    </div>
  )
}
```

- [ ] **Step 5: Прогнать тесты**

Run (из `frontend/`): `pnpm test -- ForgotPasswordCard`
Expected: PASS (5 тестов)

- [ ] **Step 6: Commit**

```bash
git add "frontend/src/app/(auth)/forgot-password"
git commit -m "feat(frontend): add /forgot-password page"
```

---

### Task 7: Страница /reset-password

**Files:**

- Create: `frontend/src/app/(auth)/reset-password/ResetPasswordCard.tsx`
- Create: `frontend/src/app/(auth)/reset-password/ResetPasswordCard.test.tsx`
- Create: `frontend/src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Написать падающие тесты**

`frontend/src/app/(auth)/reset-password/ResetPasswordCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockSearchParams, mockPush } = vi.hoisted(() => ({
  mockSearchParams: { current: new URLSearchParams() },
  mockPush: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/reset-password',
  useSearchParams: () => mockSearchParams.current,
}))

const mockAuth = {
  resetPassword: vi.fn(),
  isLoading: false,
  error: null as string | null,
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ auth: mockAuth }),
}))

import { ResetPasswordCard } from './ResetPasswordCard'

describe('ResetPasswordCard', () => {
  beforeEach(() => {
    mockSearchParams.current = new URLSearchParams('code=abc123')
    mockAuth.resetPassword.mockReset().mockResolvedValue(undefined)
    mockAuth.error = null
    mockPush.mockReset()
  })

  it('без code показывает ошибку и ссылку на /forgot-password, форму не рендерит', () => {
    mockSearchParams.current = new URLSearchParams()
    render(<ResetPasswordCard />)
    expect(screen.getByText(/отсутствует код сброса/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Запросить новую ссылку' })
    expect(link.getAttribute('href')).toBe('/forgot-password')
    expect(screen.queryByLabelText('Новый пароль')).toBeNull()
  })

  it('с code рендерит форму нового пароля', () => {
    render(<ResetPasswordCard />)
    expect(screen.getByLabelText('Новый пароль')).toBeInTheDocument()
    expect(screen.getByLabelText('Подтвердите пароль')).toBeInTheDocument()
  })

  it('показывает ошибку при несовпадении паролей', async () => {
    render(<ResetPasswordCard />)
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'newpass1')
    await userEvent.type(screen.getByLabelText('Подтвердите пароль'), 'other')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить пароль' }))
    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument()
    expect(mockAuth.resetPassword).not.toHaveBeenCalled()
  })

  it('вызывает resetPassword с code и редиректит на /', async () => {
    render(<ResetPasswordCard />)
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'newpass1')
    await userEvent.type(screen.getByLabelText('Подтвердите пароль'), 'newpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить пароль' }))
    expect(mockAuth.resetPassword).toHaveBeenCalledWith('abc123', 'newpass1', 'newpass1')
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('при ошибке кода показывает auth.error и ссылку «Запросить новую ссылку»', async () => {
    mockAuth.resetPassword.mockRejectedValueOnce(new Error('bad code'))
    mockAuth.error = 'Ссылка недействительна или устарела'
    render(<ResetPasswordCard />)
    await userEvent.type(screen.getByLabelText('Новый пароль'), 'newpass1')
    await userEvent.type(screen.getByLabelText('Подтвердите пароль'), 'newpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить пароль' }))
    expect(await screen.findByText('Ссылка недействительна или устарела')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Запросить новую ссылку' }).getAttribute('href')).toBe(
      '/forgot-password'
    )
    expect(mockPush).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run (из `frontend/`): `pnpm test -- ResetPasswordCard`
Expected: FAIL — модуль `./ResetPasswordCard` не найден.

- [ ] **Step 3: Реализация компонента**

`frontend/src/app/(auth)/reset-password/ResetPasswordCard.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

// Static schema for type inference only (without refine, which changes the type)
const _baseSchema = z.object({
  password: z.string().min(6),
  confirmPassword: z.string(),
})

type FormData = z.infer<typeof _baseSchema>

export const ResetPasswordCard = observer(function ResetPasswordCard() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(6, t('auth.validation.minPassword')),
          confirmPassword: z.string(),
        })
        .refine((d) => d.password === d.confirmPassword, {
          message: t('auth.validation.passwordsNotMatch'),
          path: ['confirmPassword'],
        }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!code) return
    try {
      await auth.resetPassword(code, data.password, data.confirmPassword)
      router.push('/')
    } catch {
      // error сохранён в auth.error
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl">{t('auth.resetPasswordTitle')}</CardTitle>
        <CardDescription>{t('auth.resetPasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!code ? (
          <div className="space-y-3">
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t('auth.resetMissingCode')}
            </p>
            <Link href="/forgot-password" className="text-sm underline hover:no-underline">
              {t('auth.requestNewLink')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('auth.newPassword')}</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {auth.error && (
              <div className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm">
                <p className="text-destructive">{auth.error}</p>
                <Link href="/forgot-password" className="block underline hover:no-underline">
                  {t('auth.requestNewLink')}
                </Link>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={auth.isLoading}>
              {auth.isLoading ? t('common.loading') : t('auth.setNewPassword')}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link href="/login" className="underline hover:no-underline">
          {t('auth.backToLogin')}
        </Link>
      </CardFooter>
    </Card>
  )
})
```

- [ ] **Step 4: Создать page.tsx (с Suspense)**

`useSearchParams` в client-компоненте требует Suspense boundary при prerender в Next.js 15.

`frontend/src/app/(auth)/reset-password/page.tsx`:

```tsx
import { Suspense } from 'react'
import { ResetPasswordCard } from './ResetPasswordCard'

export default function ResetPasswordPage() {
  return (
    <div className="flex justify-center p-4 pt-12 sm:pt-16">
      <Suspense>
        <ResetPasswordCard />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 5: Прогнать тесты**

Run (из `frontend/`): `pnpm test -- ResetPasswordCard`
Expected: PASS (5 тестов)

- [ ] **Step 6: Commit**

```bash
git add "frontend/src/app/(auth)/reset-password"
git commit -m "feat(frontend): add /reset-password page with auto-login"
```

---

### Task 8: Ссылка «Забыли пароль?» на логине

**Files:**

- Create: `frontend/src/components/auth/EmailLoginForm.test.tsx`
- Modify: `frontend/src/components/auth/EmailLoginForm.tsx`

- [ ] **Step 1: Написать падающий тест**

`frontend/src/components/auth/EmailLoginForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    auth: { loginWithEmail: vi.fn(), isLoading: false, error: null },
  }),
}))

import { EmailLoginForm } from './EmailLoginForm'

describe('EmailLoginForm', () => {
  it('содержит ссылку «Забыли пароль?» на /forgot-password', () => {
    render(<EmailLoginForm />)
    const link = screen.getByRole('link', { name: 'Забыли пароль?' })
    expect(link.getAttribute('href')).toBe('/forgot-password')
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run (из `frontend/`): `pnpm test -- EmailLoginForm`
Expected: FAIL — ссылка не найдена.

- [ ] **Step 3: Добавить ссылку**

В `frontend/src/components/auth/EmailLoginForm.tsx`:

Добавить импорт:

```tsx
import Link from 'next/link'
```

Заменить блок label пароля:

```tsx
      <div className="space-y-1.5">
        <Label htmlFor="password">{t('auth.password')}</Label>
```

на:

```tsx
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline hover:no-underline"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
```

- [ ] **Step 4: Прогнать тесты**

Run (из `frontend/`): `pnpm test -- EmailLoginForm`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/auth/EmailLoginForm.tsx frontend/src/components/auth/EmailLoginForm.test.tsx
git commit -m "feat(frontend): add forgot-password link to login form"
```

---

### Task 9: Финальная верификация

**Files:**

- Modify: `CLAUDE.md` (секция «Текущее состояние»)

- [ ] **Step 1: Полный прогон тестов и типов**

Run (из корня): `pnpm --dir backend test && pnpm --dir backend typecheck && pnpm --dir frontend test && pnpm --dir frontend typecheck`
Expected: все тесты PASS, 0 ошибок TS в обоих пакетах.

- [ ] **Step 2: Production build frontend**

Run (из `frontend/`): `pnpm build`
Expected: сборка без ошибок (в т.ч. страница `/reset-password` с Suspense prerender-ится без CSR bailout ошибки).

- [ ] **Step 3: Ручная проверка полного флоу через Mailpit**

1. `docker compose up -d` (postgres, minio, mailpit)
2. `pnpm --dir backend develop` и `pnpm --dir frontend dev`
3. Зарегистрировать email-пользователя на `/register` (или использовать существующего), выйти
4. `/login` → клик «Забыли пароль?» → ввести email → увидеть success-сообщение
5. Открыть http://localhost:8025 → письмо получено → ссылка ведёт на `http://localhost:3000/reset-password?code=...`
6. Перейти по ссылке → ввести новый пароль дважды → отправить → авто-логин и редирект на `/`
7. Выйти → войти с новым паролем → успех
8. Повторно открыть ту же ссылку из письма → попытка сброса → ошибка «Ссылка недействительна или устарела» + ссылка «Запросить новую ссылку»
9. Открыть `/reset-password` без `?code` → сообщение об ошибке, формы нет
10. Ввести несуществующий email на `/forgot-password` → тот же success-экран (нет утечки о существовании аккаунта)

- [ ] **Step 4: Обновить CLAUDE.md**

В `CLAUDE.md` перед строкой «Текущий шаг» добавить блок:

```markdown
Выполнено (Forgot Password Flow):

- Backend: nodemailer SMTP email-провайдер (`config/plugins.ts`, env SMTP\_\*), Mailpit в docker-compose (web UI :8025)
- Backend: `configurePasswordReset` в bootstrap — idempotent установка `email_reset_password` = `{FRONTEND_URL}/reset-password` в advanced settings users-permissions
- Frontend: `AuthStore.forgotPassword` + `AuthStore.resetPassword` (авто-логин по jwt из ответа)
- Frontend: страницы `(auth)/forgot-password` и `(auth)/reset-password` (Suspense для useSearchParams), ссылка «Забыли пароль?» в EmailLoginForm
- Локали: ключи `auth.forgotPassword*`/`resetPassword*` RU/EN, маппинг ошибки «Incorrect code provided»
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark forgot-password flow as done in session context"
```
