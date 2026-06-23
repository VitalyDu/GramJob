# Sprint 1 Frontend (Next.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полностью рабочий Next.js 15 frontend с авторизацией (email + Telegram), MobX, i18n, типизированным API-клиентом и адаптивным layout для Web и Telegram Mini App.

**Architecture:** App Router + Server Components по умолчанию; `'use client'` только для MobX, форм и browser APIs. JWT в localStorage через AuthStore. Dual layout: header+nav для web, bottom-nav для Telegram Mini App. i18n — client-side через react-i18next.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, TailwindCSS 4, Shadcn/UI, MobX 6 + mobx-react-lite, react-i18next, React Hook Form + Zod, Vitest + Testing Library, lucide-react

---

## Карта файлов

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css                           # TailwindCSS 4 + Shadcn/UI CSS variables
│   │   ├── layout.tsx                            # Root layout: providers + AppShell
│   │   ├── page.tsx                              # Home → простой лендинг
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx                   # Email + Telegram login
│   │   │   └── register/page.tsx                # Email register
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx                       # Shadcn Button (create via CLI)
│   │   │   └── input.tsx                        # Shadcn Input (create via CLI)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx                     # Определяет web vs mini-app, монтирует init
│   │   │   ├── WebHeader.tsx                    # Десктоп header с навигацией
│   │   │   └── MiniAppBottomNav.tsx             # Нижняя навигация Mini App
│   │   ├── auth/
│   │   │   ├── TelegramLoginWidget.tsx          # Script-based Telegram Login Widget
│   │   │   ├── EmailLoginForm.tsx               # RHF + Zod форма логина
│   │   │   └── EmailRegisterForm.tsx            # RHF + Zod форма регистрации
│   │   └── I18nProvider.tsx                     # Инициализирует i18n как side-effect
│   ├── stores/
│   │   ├── RootStore.ts                         # Синглтон: собирает все stores
│   │   ├── AuthStore.ts                         # login/logout/refresh/persist
│   │   └── StoreProvider.tsx                    # Context provider + useStores hook
│   ├── services/
│   │   └── api.ts                               # Типизированный fetch-wrapper + setAuthToken
│   ├── types/
│   │   └── api.ts                               # User, AuthResponse, ApiError, etc.
│   ├── hooks/
│   │   └── useTelegramInit.ts                   # tg.ready(), tg.expand(), auto Mini App auth
│   ├── lib/
│   │   ├── i18n.ts                              # i18next init
│   │   ├── telegram.ts                          # isTelegramMiniApp(), getTelegramWebApp()
│   │   └── utils.ts                             # cn() helper (Shadcn/UI)
│   ├── locales/
│   │   ├── ru/common.json
│   │   └── en/common.json
│   └── test/
│       └── setup.ts                             # jest-dom matchers
├── public/
├── .env.example
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Task 1: Project Scaffold — package.json, tsconfig, next.config

**Files:**

- Modify: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/.env.example`

- [ ] **Step 1: Обновить package.json**

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.3.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "mobx": "^6.13.5",
    "mobx-react-lite": "^4.0.7",
    "i18next": "^24.2.0",
    "react-i18next": "^15.2.0",
    "react-hook-form": "^7.54.0",
    "zod": "^3.24.0",
    "@hookform/resolvers": "^3.9.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "lucide-react": "^0.468.0",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-label": "^2.1.1",
    "@telegram-apps/telegram-ui": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.3.3"
  }
}
```

- [ ] **Step 2: Создать tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Создать next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'api.gramjob.com',
        pathname: '/uploads/**',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 4: Создать postcss.config.mjs**

```js
/** @type {import('postcss').Config} */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 5: Создать .env.example**

```env
NEXT_PUBLIC_API_URL=http://localhost:1337/api
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_BOT_USERNAME=GramJobBot
NEXT_PUBLIC_MINI_APP_URL=https://t.me/GramJobBot/app
```

- [ ] **Step 6: Установить зависимости и проверить**

```bash
cd frontend && pnpm install
```

Ожидаемый результат: `node_modules` создан, нет ошибок.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/next.config.ts frontend/postcss.config.mjs frontend/.env.example
git commit -m "chore(frontend): initialize Next.js 15 project scaffold"
```

---

## Task 2: Vitest Test Infrastructure

**Files:**

- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Создать vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Создать src/test/setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Проверить что тесты запускаются**

```bash
cd frontend && pnpm test
```

Ожидаемый результат: `No test files found` или `0 tests passed` — без ошибок.

- [ ] **Step 4: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/test/setup.ts
git commit -m "chore(frontend): add Vitest + Testing Library test infrastructure"
```

---

## Task 3: TailwindCSS 4 + Shadcn/UI Foundation

**Files:**

- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`

- [ ] **Step 1: Создать src/app/globals.css** (TailwindCSS 4 + Shadcn/UI CSS переменные)

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
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --radius: 0.625rem;
  }

  .dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
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
```

- [ ] **Step 2: Создать src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Создать src/components/ui/button.tsx** (Shadcn/UI Button)

```typescript
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-white shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 4: Создать src/components/ui/input.tsx** (Shadcn/UI Input)

```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **Step 5: Создать src/components/ui/label.tsx**

```typescript
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): add TailwindCSS 4 + Shadcn/UI base components"
```

---

## Task 4: API Types

**Files:**

- Create: `frontend/src/types/api.ts`

- [ ] **Step 1: Создать src/types/api.ts**

```typescript
export interface User {
  id: number
  email: string
  telegramId: string | null
  firstName: string
  lastName: string
  avatar: { url: string } | null
  language: 'ru' | 'en'
  subscriptionPlan: 'free' | 'pro' | 'max' | 'vip'
  subscriptionExpiresAt: string | null
  vacancyCredits: number
  applyCredits: number
  createdAt: string
}

export interface AuthResponse {
  jwt: string
  user: User
}

export interface TelegramWidgetUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface TelegramAuthPayload {
  initData?: string
  telegramData?: TelegramWidgetUser
}

export interface StrapiMeta {
  pagination?: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

export interface StrapiListResponse<T> {
  data: T[]
  meta: StrapiMeta
}

export interface StrapiError {
  status: number
  name: string
  message: string
  details?: unknown
}
```

- [ ] **Step 2: Проверить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: нет ошибок TypeScript.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(frontend): add API response types"
```

---

## Task 5: API Client с тестами

**Files:**

- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/services/api.test.ts`

- [ ] **Step 1: Написать тест для api client**

Создать `frontend/src/services/api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, setAuthToken, ApiClientError } from './api'

describe('api client', () => {
  beforeEach(() => {
    setAuthToken(null)
    vi.resetAllMocks()
  })

  it('отправляет GET-запрос на правильный URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/users/me')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:1337/api/users/me',
      expect.objectContaining({ method: undefined })
    )
  })

  it('добавляет Authorization header при наличии токена', async () => {
    setAuthToken('my-jwt-token')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/users/me')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt-token',
        }),
      })
    )
  })

  it('не добавляет Authorization header без токена', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/users/me')

    const calledHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(calledHeaders['Authorization']).toBeUndefined()
  })

  it('бросает ApiClientError при non-ok ответе', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () =>
        Promise.resolve({ error: { message: 'Invalid token', name: 'UnauthorizedError' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get('/users/me')).rejects.toThrow(ApiClientError)
  })

  it('отправляет POST-запрос с телом', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jwt: 'token', user: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.post('/auth/local', { identifier: 'a@b.com', password: '123456' })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:1337/api/auth/local',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'a@b.com', password: '123456' }),
      })
    )
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test src/services/api.test.ts
```

Ожидаемый результат: ошибка `Cannot find module './api'`

- [ ] **Step 3: Создать src/services/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message = (data as { error?: { message?: string } })?.error?.message ?? res.statusText
    throw new ApiClientError(res.status, data, message)
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd frontend && pnpm test src/services/api.test.ts
```

Ожидаемый результат: `5 tests passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/
git commit -m "feat(frontend): add typed API client with Authorization header"
```

---

## Task 6: MobX RootStore + StoreProvider

**Files:**

- Create: `frontend/src/stores/RootStore.ts`
- Create: `frontend/src/stores/AuthStore.ts`
- Create: `frontend/src/stores/StoreProvider.tsx`

- [ ] **Step 1: Создать src/stores/AuthStore.ts**

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import type { User, AuthResponse, TelegramAuthPayload } from '@/types/api'
import { api, setAuthToken } from '@/services/api'

const JWT_KEY = 'gramjob_jwt'

export class AuthStore {
  user: User | null = null
  jwt: string | null = null
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get isAuthenticated(): boolean {
    return this.jwt !== null && this.user !== null
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(JWT_KEY)
    if (!stored) return
    this.jwt = stored
    setAuthToken(stored)
    await this.fetchMe()
  }

  async loginWithEmail(identifier: string, password: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<AuthResponse>('/auth/local', { identifier, password })
      this._setSession(res.jwt, res.user)
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Login failed'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async registerWithEmail(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<AuthResponse>('/auth/local/register', {
        email,
        password,
        firstName,
        lastName,
      })
      this._setSession(res.jwt, res.user)
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Registration failed'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async loginWithTelegram(payload: TelegramAuthPayload): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<AuthResponse>('/auth/telegram', payload)
      this._setSession(res.jwt, res.user)
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Telegram auth failed'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMe(): Promise<void> {
    try {
      const user = await api.get<User>('/users/me')
      runInAction(() => {
        this.user = user
      })
    } catch {
      this.logout()
    }
  }

  logout(): void {
    runInAction(() => {
      this.jwt = null
      this.user = null
    })
    setAuthToken(null)
    if (typeof window !== 'undefined') localStorage.removeItem(JWT_KEY)
  }

  private _setSession(jwt: string, user: User): void {
    runInAction(() => {
      this.jwt = jwt
      this.user = user
    })
    setAuthToken(jwt)
    if (typeof window !== 'undefined') localStorage.setItem(JWT_KEY, jwt)
  }
}
```

- [ ] **Step 2: Создать src/stores/RootStore.ts**

```typescript
import { AuthStore } from './AuthStore'

export class RootStore {
  auth: AuthStore

  constructor() {
    this.auth = new AuthStore()
  }
}

export const rootStore = new RootStore()
```

- [ ] **Step 3: Создать src/stores/StoreProvider.tsx**

```typescript
'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { rootStore } from './RootStore'
import type { RootStore } from './RootStore'

const StoreContext = createContext<RootStore>(rootStore)

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    rootStore.auth.init()
  }, [])

  return <StoreContext.Provider value={rootStore}>{children}</StoreContext.Provider>
}

export function useStores(): RootStore {
  return useContext(StoreContext)
}
```

- [ ] **Step 4: Проверить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/
git commit -m "feat(frontend): add MobX RootStore, AuthStore, StoreProvider"
```

---

## Task 7: AuthStore Unit Tests

**Files:**

- Create: `frontend/src/stores/AuthStore.test.ts`

- [ ] **Step 1: Написать тесты**

Создать `frontend/src/stores/AuthStore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthStore } from './AuthStore'

vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setAuthToken: vi.fn(),
}))

import { api, setAuthToken } from '@/services/api'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const mockUser = {
  id: 1,
  email: 'test@test.com',
  telegramId: null,
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  language: 'ru' as const,
  subscriptionPlan: 'free' as const,
  subscriptionExpiresAt: null,
  vacancyCredits: 3,
  applyCredits: 3,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('AuthStore', () => {
  let store: AuthStore

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    store = new AuthStore()
  })

  it('начинает без авторизации', () => {
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.jwt).toBeNull()
  })

  it('loginWithEmail устанавливает jwt и user при успехе', async () => {
    vi.mocked(api.post).mockResolvedValue({ jwt: 'test-jwt', user: mockUser })

    await store.loginWithEmail('test@test.com', 'password123')

    expect(store.jwt).toBe('test-jwt')
    expect(store.user).toEqual(mockUser)
    expect(store.isAuthenticated).toBe(true)
    expect(localStorageMock.getItem('gramjob_jwt')).toBe('test-jwt')
    expect(setAuthToken).toHaveBeenCalledWith('test-jwt')
  })

  it('loginWithEmail устанавливает error при ошибке', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Invalid credentials'))

    await expect(store.loginWithEmail('bad@test.com', 'wrong')).rejects.toThrow()

    expect(store.error).toBe('Invalid credentials')
    expect(store.isAuthenticated).toBe(false)
  })

  it('registerWithEmail сохраняет сессию при успехе', async () => {
    vi.mocked(api.post).mockResolvedValue({ jwt: 'reg-jwt', user: mockUser })

    await store.registerWithEmail('new@test.com', 'pass123', 'Ivan', 'Ivanov')

    expect(store.isAuthenticated).toBe(true)
    expect(store.jwt).toBe('reg-jwt')
  })

  it('loginWithTelegram вызывает /auth/telegram endpoint', async () => {
    vi.mocked(api.post).mockResolvedValue({ jwt: 'tg-jwt', user: mockUser })

    await store.loginWithTelegram({ initData: 'tg_init_data' })

    expect(api.post).toHaveBeenCalledWith('/auth/telegram', { initData: 'tg_init_data' })
    expect(store.isAuthenticated).toBe(true)
  })

  it('logout очищает сессию', async () => {
    vi.mocked(api.post).mockResolvedValue({ jwt: 'jwt', user: mockUser })
    await store.loginWithEmail('test@test.com', 'pass')

    store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.jwt).toBeNull()
    expect(localStorageMock.getItem('gramjob_jwt')).toBeNull()
    expect(setAuthToken).toHaveBeenLastCalledWith(null)
  })

  it('init восстанавливает сессию из localStorage', async () => {
    localStorageMock.setItem('gramjob_jwt', 'stored-jwt')
    vi.mocked(api.get).mockResolvedValue(mockUser)

    await store.init()

    expect(store.jwt).toBe('stored-jwt')
    expect(store.user).toEqual(mockUser)
    expect(setAuthToken).toHaveBeenCalledWith('stored-jwt')
  })

  it('init вызывает logout если /users/me падает', async () => {
    localStorageMock.setItem('gramjob_jwt', 'expired-jwt')
    vi.mocked(api.get).mockRejectedValue(new Error('Unauthorized'))

    await store.init()

    expect(store.isAuthenticated).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что проходит**

```bash
cd frontend && pnpm test src/stores/AuthStore.test.ts
```

Ожидаемый результат: `8 tests passed`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/AuthStore.test.ts
git commit -m "test(frontend): add AuthStore unit tests"
```

---

## Task 8: i18next Setup

**Files:**

- Create: `frontend/src/lib/i18n.ts`
- Create: `frontend/src/locales/ru/common.json`
- Create: `frontend/src/locales/en/common.json`
- Create: `frontend/src/components/I18nProvider.tsx`

- [ ] **Step 1: Создать src/locales/ru/common.json**

```json
{
  "nav": {
    "vacancies": "Вакансии",
    "favorites": "Избранное",
    "applications": "Отклики",
    "profile": "Профиль",
    "dashboard": "Кабинет",
    "login": "Войти"
  },
  "auth": {
    "email": "Email",
    "password": "Пароль",
    "confirmPassword": "Подтвердите пароль",
    "firstName": "Имя",
    "lastName": "Фамилия",
    "login": "Войти",
    "register": "Зарегистрироваться",
    "telegramLogin": "Войти через Telegram",
    "noAccount": "Нет аккаунта?",
    "hasAccount": "Уже есть аккаунт?",
    "orDivider": "или"
  },
  "common": {
    "loading": "Загрузка...",
    "error": "Произошла ошибка",
    "save": "Сохранить",
    "cancel": "Отмена",
    "back": "Назад"
  },
  "home": {
    "tagline": "Международная биржа вакансий в Telegram",
    "cta": "Начать"
  }
}
```

- [ ] **Step 2: Создать src/locales/en/common.json**

```json
{
  "nav": {
    "vacancies": "Vacancies",
    "favorites": "Favorites",
    "applications": "Applications",
    "profile": "Profile",
    "dashboard": "Dashboard",
    "login": "Sign In"
  },
  "auth": {
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm password",
    "firstName": "First Name",
    "lastName": "Last Name",
    "login": "Sign In",
    "register": "Sign Up",
    "telegramLogin": "Sign in with Telegram",
    "noAccount": "No account?",
    "hasAccount": "Already have an account?",
    "orDivider": "or"
  },
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "save": "Save",
    "cancel": "Cancel",
    "back": "Back"
  },
  "home": {
    "tagline": "International job board in Telegram",
    "cta": "Get Started"
  }
}
```

- [ ] **Step 3: Создать src/lib/i18n.ts**

```typescript
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import ruCommon from '@/locales/ru/common.json'
import enCommon from '@/locales/en/common.json'

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: 'ru',
    fallbackLng: 'en',
    resources: {
      ru: { common: ruCommon },
      en: { common: enCommon },
    },
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })
}

export default i18next
```

- [ ] **Step 4: Создать src/components/I18nProvider.tsx**

```typescript
'use client'

import { type ReactNode } from 'react'
import '@/lib/i18n'

export function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/i18n.ts frontend/src/locales/ frontend/src/components/I18nProvider.tsx
git commit -m "feat(frontend): add i18next with RU/EN locales"
```

---

## Task 9: Telegram Mini App Library

**Files:**

- Create: `frontend/src/lib/telegram.ts`
- Create: `frontend/src/hooks/useTelegramInit.ts`

- [ ] **Step 1: Создать src/lib/telegram.ts** (типы + утилиты, нет runtime-зависимостей)

```typescript
export interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive: boolean) => void
    hideProgress: () => void
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
      photo_url?: string
    }
    start_param?: string
    auth_date: number
    hash: string
  }
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  openInvoice: (url: string, callback?: (status: string) => void) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export function isTelegramMiniApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  return window.Telegram?.WebApp ?? null
}
```

- [ ] **Step 2: Создать src/hooks/useTelegramInit.ts**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { isTelegramMiniApp, getTelegramWebApp, type TelegramWebApp } from '@/lib/telegram'
import { useStores } from '@/stores/StoreProvider'

export function useTelegramInit() {
  const [isMiniApp, setIsMiniApp] = useState(false)
  const [twa, setTwa] = useState<TelegramWebApp | null>(null)
  const { auth } = useStores()

  useEffect(() => {
    const isMA = isTelegramMiniApp()
    setIsMiniApp(isMA)
    if (!isMA) return

    const app = getTelegramWebApp()!
    setTwa(app)
    app.ready()
    app.expand()

    if (!auth.isAuthenticated && app.initData) {
      auth.loginWithTelegram({ initData: app.initData }).catch(() => {
        // ошибка уже в auth.error
      })
    }
  }, [auth])

  return { isMiniApp, twa }
}
```

- [ ] **Step 3: Проверить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/telegram.ts frontend/src/hooks/useTelegramInit.ts
git commit -m "feat(frontend): add Telegram Mini App utilities and useTelegramInit hook"
```

---

## Task 10: Layout Components

**Files:**

- Create: `frontend/src/components/layout/WebHeader.tsx`
- Create: `frontend/src/components/layout/MiniAppBottomNav.tsx`
- Create: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Создать src/components/layout/WebHeader.tsx**

```typescript
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'

export const WebHeader = observer(function WebHeader() {
  const { t } = useTranslation()
  const { auth } = useStores()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-bold text-lg text-primary">
          GramJob
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/vacancies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('nav.vacancies')}
          </Link>

          {auth.isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.dashboard')}
              </Link>
              <Button variant="ghost" size="sm" onClick={() => auth.logout()}>
                Выйти
              </Button>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{t('nav.login')}</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  )
})
```

- [ ] **Step 2: Создать src/components/layout/MiniAppBottomNav.tsx**

```typescript
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import { Briefcase, Heart, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MiniAppBottomNav() {
  const { t } = useTranslation()
  const pathname = usePathname()

  const links = [
    { href: '/vacancies', icon: Briefcase, label: t('nav.vacancies') },
    { href: '/dashboard/favorites', icon: Heart, label: t('nav.favorites') },
    { href: '/dashboard/applications', icon: MessageSquare, label: t('nav.applications') },
    { href: '/dashboard/profile', icon: User, label: t('nav.profile') },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex">
        {links.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors',
              pathname.startsWith(href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Создать src/components/layout/AppShell.tsx**

```typescript
'use client'

import { type ReactNode } from 'react'
import { useTelegramInit } from '@/hooks/useTelegramInit'
import { WebHeader } from './WebHeader'
import { MiniAppBottomNav } from './MiniAppBottomNav'

export function AppShell({ children }: { children: ReactNode }) {
  const { isMiniApp } = useTelegramInit()

  return (
    <div className="flex min-h-screen flex-col">
      {!isMiniApp && <WebHeader />}
      <main className={`flex-1 ${isMiniApp ? 'pb-16' : ''}`}>
        <div className="container mx-auto px-4 py-6">{children}</div>
      </main>
      {isMiniApp && <MiniAppBottomNav />}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/
git commit -m "feat(frontend): add WebHeader, MiniAppBottomNav, AppShell layout components"
```

---

## Task 11: Root Layout + Home Page

**Files:**

- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`

- [ ] **Step 1: Создать src/app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/stores/StoreProvider'
import { I18nProvider } from '@/components/I18nProvider'
import { AppShell } from '@/components/layout/AppShell'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'GramJob — Биржа вакансий в Telegram',
  description: 'Международная биржа вакансий и резюме в экосистеме Telegram',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">
        <I18nProvider>
          <StoreProvider>
            <AppShell>{children}</AppShell>
          </StoreProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Создать src/app/page.tsx**

```typescript
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4">GramJob</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Международная биржа вакансий в экосистеме Telegram
      </p>
      <div className="flex gap-3">
        <Link
          href="/vacancies"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Смотреть вакансии
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          Войти
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Убедиться что dev-сервер запускается**

```bash
cd frontend && pnpm dev
```

Открыть `http://localhost:3000` — должен отображаться лендинг с хедером. Остановить сервер (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/page.tsx
git commit -m "feat(frontend): add root layout with providers and home page"
```

---

## Task 12: Telegram Login Widget Component + Page

**Files:**

- Create: `frontend/src/components/auth/TelegramLoginWidget.tsx`
- Create: `frontend/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Создать src/components/auth/TelegramLoginWidget.tsx**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStores } from '@/stores/StoreProvider'
import type { TelegramWidgetUser } from '@/types/api'

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void
  }
}

interface Props {
  redirectTo?: string
}

export function TelegramLoginWidget({ redirectTo = '/' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { auth } = useStores()
  const router = useRouter()
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'GramJobBot'

  useEffect(() => {
    window.onTelegramAuth = async (user: TelegramWidgetUser) => {
      try {
        await auth.loginWithTelegram({ telegramData: user })
        router.push(redirectTo)
      } catch {
        // error сохранён в auth.error
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true

    const container = containerRef.current
    container?.appendChild(script)

    return () => {
      delete window.onTelegramAuth
      container?.removeChild(script)
    }
  }, [auth, botUsername, redirectTo, router])

  return <div ref={containerRef} />
}
```

- [ ] **Step 2: Создать src/app/(auth)/login/page.tsx**

```typescript
import Link from 'next/link'
import { TelegramLoginWidget } from '@/components/auth/TelegramLoginWidget'
import { EmailLoginForm } from '@/components/auth/EmailLoginForm'

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-8 text-center text-2xl font-bold">Войти в GramJob</h1>

      <div className="mb-6 flex justify-center">
        <TelegramLoginWidget redirectTo="/" />
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-muted-foreground">или</span>
        </div>
      </div>

      <EmailLoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auth/TelegramLoginWidget.tsx frontend/src/app/\(auth\)/login/page.tsx
git commit -m "feat(frontend): add Telegram Login Widget and login page"
```

---

## Task 13: Email Login Form

**Files:**

- Create: `frontend/src/components/auth/EmailLoginForm.tsx`

- [ ] **Step 1: Создать src/components/auth/EmailLoginForm.tsx**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  identifier: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
})

type FormData = z.infer<typeof schema>

export const EmailLoginForm = observer(function EmailLoginForm() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await auth.loginWithEmail(data.identifier, data.password)
      router.push('/')
    } catch {
      // error сохранён в auth.error
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="identifier">{t('auth.email')}</Label>
        <Input id="identifier" type="email" {...register('identifier')} />
        {errors.identifier && (
          <p className="text-xs text-destructive">{errors.identifier.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {auth.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {auth.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={auth.isLoading}>
        {auth.isLoading ? t('common.loading') : t('auth.login')}
      </Button>
    </form>
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/auth/EmailLoginForm.tsx
git commit -m "feat(frontend): add EmailLoginForm with RHF + Zod validation"
```

---

## Task 14: Email Register Form + Page

**Files:**

- Create: `frontend/src/components/auth/EmailRegisterForm.tsx`
- Create: `frontend/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Создать src/components/auth/EmailRegisterForm.tsx**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z
  .object({
    firstName: z.string().min(1, 'Введите имя'),
    lastName: z.string().min(1, 'Введите фамилию'),
    email: z.string().email('Введите корректный email'),
    password: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export const EmailRegisterForm = observer(function EmailRegisterForm() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await auth.registerWithEmail(data.email, data.password, data.firstName, data.lastName)
      router.push('/')
    } catch {
      // error сохранён в auth.error
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="firstName">{t('auth.firstName')}</Label>
          <Input id="firstName" {...register('firstName')} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">{t('auth.lastName')}</Label>
          <Input id="lastName" {...register('lastName')} />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
        <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {auth.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {auth.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={auth.isLoading}>
        {auth.isLoading ? t('common.loading') : t('auth.register')}
      </Button>
    </form>
  )
})
```

- [ ] **Step 2: Создать src/app/(auth)/register/page.tsx**

```typescript
import Link from 'next/link'
import { EmailRegisterForm } from '@/components/auth/EmailRegisterForm'

export default function RegisterPage() {
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-8 text-center text-2xl font-bold">Создать аккаунт</h1>
      <EmailRegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Финальная проверка**

```bash
cd frontend && pnpm typecheck && pnpm test && pnpm build
```

Ожидаемый результат: typecheck — 0 ошибок, test — все тесты зелёные, build — успешен.

- [ ] **Step 4: Финальный commit**

```bash
git add frontend/src/components/auth/EmailRegisterForm.tsx frontend/src/app/\(auth\)/register/page.tsx
git commit -m "feat(frontend): add EmailRegisterForm and register page — Sprint 1 Frontend complete"
```

---

## Self-Review: Покрытие спека

| Sprint 1 Frontend задача                                                   | Покрыта                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Инициализировать Next.js 15 (App Router, TypeScript strict)                | Task 1 ✓                                                                  |
| Настроить TailwindCSS 4                                                    | Task 3 ✓                                                                  |
| Установить Telegram UI + Shadcn/UI (базовые компоненты)                    | Task 3 ✓ (`@telegram-apps/telegram-ui` в deps, Shadcn Button/Input/Label) |
| Настроить MobX: RootStore + StoreProvider                                  | Task 6 ✓                                                                  |
| Настроить i18next (RU/EN, `useTranslation`, переводы в `locales/`)         | Task 8 ✓                                                                  |
| API-клиент: типизированный fetch-wrapper с JWT в header                    | Task 5 ✓                                                                  |
| AuthStore: login, logout, refresh, persist                                 | Task 6–7 ✓                                                                |
| Страница: Telegram Login Widget (Web)                                      | Task 12 ✓                                                                 |
| Страница: Email Login/Register форма (React Hook Form + Zod)               | Task 13–14 ✓                                                              |
| Telegram Mini App init: `tg.ready()`, `tg.expand()`, определение контекста | Task 9 ✓                                                                  |
| Layout: базовый shell (header/nav для Web, bottom-nav для Mini App)        | Task 10–11 ✓                                                              |
