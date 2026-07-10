# Account & UX Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать пакет из 9 улучшений: удаление сохранённых поисков, админ-уведомления о модерации, email-верификация, автоопределение языка, аватар пользователя, редизайн «Мой кабинет», кнопка «Избранное» и «Подписка» в header, меню пользователя, страница «Настройки».

**Architecture:** Точечные изменения по существующим паттернам. Встроенные механизмы Strapi (email confirmation, change-password, upload) вместо кастомных. Спек: `docs/superpowers/specs/2026-07-10-account-ux-batch-design.md`.

**Tech Stack:** Next.js 15 + MobX + TailwindCSS 4 + Shadcn/UI (frontend, тесты vitest), Strapi 5 + PostgreSQL (backend, тесты jest).

**Команды проверки** (из корня репо):

- Frontend: `pnpm --filter frontend test`, `pnpm --filter frontend typecheck`
- Backend: `pnpm --filter backend test`, `pnpm --filter backend typecheck`

---

### Task 1: Удаление сохранённых поисков — backend

**Files:**

- Delete: `backend/src/api/saved-search/` (вся директория)
- Modify: `backend/src/scripts/seed-permissions.ts`
- Modify: `backend/config/cron-tasks.ts`
- Modify: `backend/types/generated/contentTypes.d.ts`

- [ ] **Step 1: Удалить директорию API**

```bash
git rm -r backend/src/api/saved-search
```

- [ ] **Step 2: Перенести permissions в REMOVED**

В `backend/src/scripts/seed-permissions.ts` удалить из `AUTHENTICATED_PERMISSIONS` три строки:

```ts
  'api::saved-search.saved-search.findMine',
  'api::saved-search.saved-search.create',
  'api::saved-search.saved-search.remove',
```

и добавить их в `REMOVED_PERMISSIONS.authenticated`:

```ts
const REMOVED_PERMISSIONS: Record<'authenticated' | 'public', string[]> = {
  authenticated: [
    'api::payment.payment.buyVacancyPack',
    'api::payment.payment.buyApplyPack',
    'api::saved-search.saved-search.findMine',
    'api::saved-search.saved-search.create',
    'api::saved-search.saved-search.remove',
  ],
  public: ['api::resume.resume.findPublic', 'api::resume.resume.findOne'],
}
```

- [ ] **Step 3: Удалить cron проверки сохранённых поисков**

В `backend/config/cron-tasks.ts`:

1. Удалить импорт:

```ts
import {
  buildVacancyFiltersFromSaved,
  buildResumeFiltersFromSaved,
} from '../src/api/saved-search/services/saved-search-utils'
```

2. Удалить целиком блок `'0 */2 * * *': { ... }` (комментарий «Every 2 hours: check saved searches...» и весь объект задачи до закрывающего `},` включительно).

- [ ] **Step 4: Почистить contentTypes.d.ts**

В `backend/types/generated/contentTypes.d.ts` найти и удалить:

1. Интерфейс `ApiSavedSearchSavedSearch` (весь блок `export interface ApiSavedSearchSavedSearch ... { ... }`)
2. Строку `'api::saved-search.saved-search': ApiSavedSearchSavedSearch` из реестра `ContentTypeSchemas` (в конце файла)

Проверить, что не осталось упоминаний: `grep -rn "saved-search" backend/types/`

- [ ] **Step 5: Typecheck + тесты**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: PASS (если jest находил тесты в `api/saved-search` — они удалены вместе с директорией)

- [ ] **Step 6: Commit**

```bash
git add -A backend
git commit -m "feat(backend): remove saved-search feature"
```

---

### Task 2: Удаление сохранённых поисков — frontend

**Files:**

- Delete: `frontend/src/app/dashboard/saved-searches/`, `frontend/src/components/saved-search/`, `frontend/src/stores/SavedSearchStore.ts`, `frontend/src/stores/SavedSearchStore.test.ts`
- Create: `frontend/src/lib/search-params.ts`, `frontend/src/lib/search-params.test.ts` (перенос `parseVacancySearchParams` из saved-search-utils)
- Delete: `frontend/src/lib/saved-search-utils.ts`, `frontend/src/lib/saved-search-utils.test.ts`
- Modify: `frontend/src/stores/RootStore.ts`, `frontend/src/app/vacancies/VacanciesClient.tsx`, `frontend/src/app/resumes/ResumesClient.tsx`, `frontend/src/app/dashboard/DashboardClient.tsx`, `frontend/src/app/dashboard/profile/ProfileClient.tsx`, `frontend/src/types/api.ts`, `frontend/src/locales/ru/common.json`, `frontend/src/locales/en/common.json`

**Важно:** `parseVacancySearchParams` из `lib/saved-search-utils.ts` используется в VacanciesClient и НЕ связан с сохранёнными поисками — его нужно перенести, а не удалить.

- [ ] **Step 1: Создать `frontend/src/lib/search-params.ts`**

Скопировать из `lib/saved-search-utils.ts` функцию `parseVacancySearchParams` вместе с константами `VACANCY_MULTI_KEYS`, `VACANCY_STRING_KEYS`, `VACANCY_NUMBER_KEYS`:

```ts
import type { VacancyListParams } from '@/types/api'

const VACANCY_MULTI_KEYS = ['workFormat', 'employmentType', 'seniority'] as const
const VACANCY_STRING_KEYS = [
  'search',
  'industry',
  'specialization',
  'country',
  'city',
  'salaryCurrency',
  'sort',
] as const
const VACANCY_NUMBER_KEYS = ['salaryFrom', 'salaryTo'] as const

export function parseVacancySearchParams(sp: URLSearchParams): VacancyListParams {
  const params: Record<string, unknown> = { page: 1 }

  for (const key of VACANCY_MULTI_KEYS) {
    const values = sp
      .getAll(key)
      .flatMap((v) => v.split(','))
      .filter(Boolean)
    if (values.length > 0) params[key] = values
  }

  for (const key of VACANCY_STRING_KEYS) {
    const value = sp.get(key)
    if (value) params[key] = value
  }

  for (const key of VACANCY_NUMBER_KEYS) {
    const value = Number(sp.get(key))
    if (sp.get(key) && Number.isFinite(value)) params[key] = value
  }

  return params as VacancyListParams
}
```

(Комментарий про «совместимость со старыми сохранёнными поисками» не переносить.)

- [ ] **Step 2: Перенести тесты `parseVacancySearchParams`**

Скопировать из `lib/saved-search-utils.test.ts` только тесты `parseVacancySearchParams` в новый `frontend/src/lib/search-params.test.ts`, поправив импорт на `./search-params`.

- [ ] **Step 3: Удалить файлы**

```bash
git rm -r frontend/src/app/dashboard/saved-searches frontend/src/components/saved-search
git rm frontend/src/stores/SavedSearchStore.ts frontend/src/stores/SavedSearchStore.test.ts
git rm frontend/src/lib/saved-search-utils.ts frontend/src/lib/saved-search-utils.test.ts
```

- [ ] **Step 4: RootStore — убрать savedSearch**

В `frontend/src/stores/RootStore.ts` удалить: импорт `SavedSearchStore`, поле `savedSearch: SavedSearchStore`, строку `this.savedSearch = new SavedSearchStore()`.

- [ ] **Step 5: VacanciesClient**

- Удалить импорты `SaveSearchButton` и `paramsToSavedFilters`; импорт `parseVacancySearchParams` заменить на `import { parseVacancySearchParams } from '@/lib/search-params'`
- Удалить оба JSX-вхождения `<SaveSearchButton searchType="vacancy" filters={paramsToSavedFilters(params)} />` (строки ~108 и ~114)

- [ ] **Step 6: ResumesClient**

- Удалить импорт `SaveSearchButton` и оба JSX-вхождения `<SaveSearchButton ... />` (строки ~147 и ~161); если после этого `paramsToSavedFilters` больше не используется — удалить и его импорт

- [ ] **Step 7: DashboardClient и ProfileClient**

- `DashboardClient.tsx`: удалить объект секции с `href: '/dashboard/saved-searches'` из `SECTIONS` и импорт иконки `Search`, если больше не используется
- `ProfileClient.tsx`: удалить строку `{ href: '/dashboard/saved-searches', ... }` из `LINKS`

- [ ] **Step 8: Типы и локали**

- `types/api.ts`: удалить `SavedSearchType`, `SavedSearchFilters`, `SavedSearch`, `SavedSearchCreateInput` (строки ~501–517)
- `locales/ru/common.json` и `locales/en/common.json`: удалить top-level ключ `savedSearch`, ключи `dashboard.sections_list.savedSearches`, `dashboard.savedSearches`, `dashboard.profile.links.savedSearches`
- Проверить остатки: `grep -rn "savedSearch\|saved-search\|SavedSearch" frontend/src` — должно быть пусто

- [ ] **Step 9: Typecheck + тесты**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS. Если падают тесты DashboardClient/ProfileClient из-за удалённых ссылок — убрать соответствующие assertions.

- [ ] **Step 10: Commit**

```bash
git add -A frontend
git commit -m "feat(frontend): remove saved-search feature"
```

---

### Task 3: Автоопределение языка (i18n)

**Files:**

- Create: `frontend/src/lib/detect-language.ts`
- Test: `frontend/src/lib/detect-language.test.ts`
- Modify: `frontend/src/lib/i18n.ts`

- [ ] **Step 1: Написать падающий тест**

`frontend/src/lib/detect-language.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { detectLanguage } from './detect-language'

describe('detectLanguage', () => {
  it('возвращает сохранённый язык, если он валиден', () => {
    expect(detectLanguage({ stored: 'en', telegramLangCode: 'ru', navigatorLang: 'ru-RU' })).toBe(
      'en'
    )
  })

  it('игнорирует невалидное сохранённое значение', () => {
    expect(detectLanguage({ stored: 'de', telegramLangCode: 'ru', navigatorLang: 'en-US' })).toBe(
      'ru'
    )
  })

  it('использует язык Telegram, если localStorage пуст', () => {
    expect(detectLanguage({ stored: null, telegramLangCode: 'ru', navigatorLang: 'en-US' })).toBe(
      'ru'
    )
  })

  it('неподдерживаемый язык Telegram → en', () => {
    expect(detectLanguage({ stored: null, telegramLangCode: 'uk', navigatorLang: 'ru-RU' })).toBe(
      'en'
    )
  })

  it('без Telegram использует язык браузера', () => {
    expect(
      detectLanguage({ stored: null, telegramLangCode: undefined, navigatorLang: 'ru-RU' })
    ).toBe('ru')
    expect(
      detectLanguage({ stored: null, telegramLangCode: undefined, navigatorLang: 'de-DE' })
    ).toBe('en')
  })

  it('без каких-либо источников → en', () => {
    expect(
      detectLanguage({ stored: null, telegramLangCode: undefined, navigatorLang: undefined })
    ).toBe('en')
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `pnpm --filter frontend test -- detect-language`
Expected: FAIL — модуль не найден

- [ ] **Step 3: Реализация**

`frontend/src/lib/detect-language.ts`:

```ts
export type SupportedLang = 'ru' | 'en'

function mapToSupported(code: string): SupportedLang {
  return code.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export function detectLanguage(input: {
  stored: string | null
  telegramLangCode: string | undefined
  navigatorLang: string | undefined
}): SupportedLang {
  const { stored, telegramLangCode, navigatorLang } = input
  if (stored === 'ru' || stored === 'en') return stored
  if (telegramLangCode) return mapToSupported(telegramLangCode)
  if (navigatorLang) return mapToSupported(navigatorLang)
  return 'en'
}
```

- [ ] **Step 4: Тест зелёный**

Run: `pnpm --filter frontend test -- detect-language`
Expected: PASS

- [ ] **Step 5: Подключить в i18n.ts**

Заменить содержимое `frontend/src/lib/i18n.ts`:

```ts
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { detectLanguage } from '@/lib/detect-language'

import ruCommon from '@/locales/ru/common.json'
import enCommon from '@/locales/en/common.json'

type TelegramGlobal = {
  Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } }
}

function resolveInitialLang(): string {
  // SSR: язык уточнится на клиенте при гидрации
  if (typeof window === 'undefined') return 'ru'
  const lang = detectLanguage({
    stored: localStorage.getItem('gramjob_lang'),
    telegramLangCode: (window as unknown as TelegramGlobal).Telegram?.WebApp?.initDataUnsafe?.user
      ?.language_code,
    navigatorLang: navigator.language,
  })
  localStorage.setItem('gramjob_lang', lang)
  return lang
}

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: resolveInitialLang(),
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

- [ ] **Step 6: Typecheck + все тесты**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/detect-language.ts frontend/src/lib/detect-language.test.ts frontend/src/lib/i18n.ts
git commit -m "feat(frontend): detect initial language from Telegram/browser"
```

---

### Task 4: Админ-уведомления о модерации в Telegram

**Files:**

- Create: `backend/src/services/admin-notify.ts`
- Test: `backend/src/services/admin-notify.test.ts`
- Modify: `backend/src/api/vacancy/content-types/vacancy/lifecycles.ts`
- Modify: `backend/src/api/resume/content-types/resume/lifecycles.ts`
- Modify: `backend/src/api/company/content-types/company/lifecycles.ts`
- Modify: `backend/src/api/report/controllers/report.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Написать падающие тесты**

`backend/src/services/admin-notify.test.ts`:

```ts
import { parseAdminChatIds, buildAdminModerationText } from './admin-notify'

describe('parseAdminChatIds', () => {
  it('пустой/отсутствующий env → []', () => {
    expect(parseAdminChatIds(undefined)).toEqual([])
    expect(parseAdminChatIds('')).toEqual([])
  })

  it('парсит список через запятую с пробелами', () => {
    expect(parseAdminChatIds('123, 456 ,789')).toEqual(['123', '456', '789'])
  })

  it('отбрасывает пустые элементы', () => {
    expect(parseAdminChatIds('123,,456,')).toEqual(['123', '456'])
  })
})

describe('buildAdminModerationText', () => {
  it('вакансия на модерации с автором', () => {
    expect(
      buildAdminModerationText({
        entityType: 'vacancy',
        title: 'Frontend Developer',
        authorName: 'Ivan Petrov',
        authorId: 42,
      })
    ).toBe('🛡 Вакансия на модерации: «Frontend Developer» от Ivan Petrov (#42)')
  })

  it('жалоба', () => {
    expect(buildAdminModerationText({ entityType: 'report', title: 'spam' })).toBe(
      '🛡 Новая жалоба: «spam»'
    )
  })

  it('без автора', () => {
    expect(buildAdminModerationText({ entityType: 'company', title: 'Acme' })).toBe(
      '🛡 Компания на модерации: «Acme»'
    )
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `pnpm --filter backend test -- admin-notify`
Expected: FAIL — модуль не найден

- [ ] **Step 3: Реализация**

`backend/src/services/admin-notify.ts`:

```ts
import type { Core } from '@strapi/strapi'
import { sendMessage } from '../api/payment/services/telegram-bot'

export interface AdminModerationEvent {
  entityType: 'vacancy' | 'resume' | 'company' | 'report'
  title: string
  authorName?: string
  authorId?: number
  documentId?: string
}

const ENTITY_UIDS: Record<AdminModerationEvent['entityType'], string> = {
  vacancy: 'api::vacancy.vacancy',
  resume: 'api::resume.resume',
  company: 'api::company.company',
  report: 'api::report.report',
}

export function parseAdminChatIds(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function buildAdminModerationText(event: AdminModerationEvent): string {
  const prefix =
    event.entityType === 'report'
      ? 'Новая жалоба'
      : `${{ vacancy: 'Вакансия', resume: 'Резюме', company: 'Компания' }[event.entityType]} на модерации`
  const author = event.authorName
    ? ` от ${event.authorName}${event.authorId ? ` (#${event.authorId})` : ''}`
    : ''
  return `🛡 ${prefix}: «${event.title}»${author}`
}

// Fire-and-forget: модерационный флоу не должен падать из-за Telegram
export function notifyAdmins(strapi: Core.Strapi, event: AdminModerationEvent): void {
  const chatIds = parseAdminChatIds(process.env.ADMIN_TELEGRAM_CHAT_IDS)
  if (chatIds.length === 0) return

  let text = buildAdminModerationText(event)
  const adminUrl = process.env.ADMIN_URL
  if (adminUrl && event.documentId) {
    // Ссылка в тексте, а не inline-кнопкой: Telegram отклоняет кнопки с localhost-URL
    text += `\n${adminUrl.replace(/\/$/, '')}/content-manager/collection-types/${ENTITY_UIDS[event.entityType]}/${event.documentId}`
  }

  for (const chatId of chatIds) {
    try {
      sendMessage(chatId, { text })
    } catch (err) {
      strapi.log.error(`[admin-notify] Failed to notify admin chat ${chatId}`, err)
    }
  }
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm --filter backend test -- admin-notify`
Expected: PASS

- [ ] **Step 5: Вызовы из lifecycle hooks**

Во всех трёх файлах добавить импорт (число `../` по месту):

```ts
import { notifyAdmins } from '../../../../services/admin-notify'
```

**`vacancy/lifecycles.ts`** — два места:

1. В `afterCreate`, внутри `try` сразу после `await logModeration(...)` (вакансии создаются сразу в `moderation`):

```ts
notifyAdmins(s, {
  entityType: 'vacancy',
  title: ((event.params.data?.['title'] as string) ?? '') || '',
  ...(documentId ? { documentId } : {}),
})
```

2. В `afterUpdate`, внутри ветки `if (statusSet === 'moderation')` после `await logModeration(...)` (до `return`):

```ts
notifyAdmins(s, {
  entityType: 'vacancy',
  title: vacancy?.title ?? '',
  ...(vacancy?.postedBy?.id ? { authorId: vacancy.postedBy.id } : {}),
  documentId,
})
```

**`resume/lifecycles.ts`** и **`company/lifecycles.ts`** — найти аналогичные места, где выполняется `logModeration(..., action: 'submitted')` (переход в `moderation`), и добавить такой же вызов с `entityType: 'resume'` / `entityType: 'company'` и соответствующим полем заголовка (`title` у резюме, `name` у компании). Если у сущности в этом месте доступен владелец — передать `authorId`.

- [ ] **Step 6: Вызов из report controller**

В `backend/src/api/report/controllers/report.ts` в `create` после создания report (перед `return ctx.send(...)`):

```ts
notifyAdmins(strapi, {
  entityType: 'report',
  title: `${type} #${targetId}: ${reason}`,
  authorId: user.id,
  documentId: report.documentId,
})
```

Импорт: `import { notifyAdmins } from '../../../services/admin-notify'`

- [ ] **Step 7: .env.example**

В `backend/.env.example` в секцию `# TELEGRAM` добавить:

```
# Chat ID администраторов для уведомлений о модерации (через запятую)
ADMIN_TELEGRAM_CHAT_IDS=
# Базовый URL админки для ссылок в уведомлениях (например https://api.gramjob.com/admin)
ADMIN_URL=
```

- [ ] **Step 8: Typecheck + тесты + commit**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: PASS

```bash
git add backend
git commit -m "feat(backend): notify admins in Telegram on moderation submissions"
```

---

### Task 5: Email-верификация — backend

**Files:**

- Create: `backend/src/scripts/setup-email-confirmation.ts`
- Create: `backend/database/migrations/2026.07.10T00.00.00.confirm-existing-users.js`
- Modify: `backend/src/index.ts`

Telegram-регистрация уже создаёт пользователей с `confirmed: true` (`telegram-auth.ts`) — менять не нужно. Permission `plugin::users-permissions.auth.sendEmailConfirmation` и `emailConfirmation` уже в `PUBLIC_PERMISSIONS`.

- [ ] **Step 1: Скрипт настройки email confirmation**

`backend/src/scripts/setup-email-confirmation.ts` (по образцу `setup-password-reset.ts`):

```ts
import type { Core } from '@strapi/strapi'

export async function configureEmailConfirmation(strapi: Core.Strapi): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL
  if (!frontendUrl) {
    strapi.log.warn('[auth] FRONTEND_URL not set — email confirmation not configured')
    return
  }

  const redirect = `${frontendUrl.replace(/\/$/, '')}/email-confirmed`
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' })
  const advanced = ((await store.get({ key: 'advanced' })) ?? {}) as Record<string, unknown>

  if (
    advanced.email_confirmation === true &&
    advanced.email_confirmation_redirection === redirect
  ) {
    return
  }

  await store.set({
    key: 'advanced',
    value: { ...advanced, email_confirmation: true, email_confirmation_redirection: redirect },
  })
  strapi.log.info(`[auth] Email confirmation enabled, redirect: ${redirect}`)
}
```

- [ ] **Step 2: Одноразовая миграция для существующих пользователей**

`backend/database/migrations/2026.07.10T00.00.00.confirm-existing-users.js`:

```js
'use strict'

// Одноразово подтверждаем всех существующих пользователей при включении
// обязательной email-верификации — иначе они не смогут войти.
// НЕ в bootstrap: bootstrap выполняется на каждом старте и автоподтверждал бы
// новых незавершивших верификацию пользователей.
module.exports = {
  async up(knex) {
    await knex('up_users').where({ confirmed: false }).update({ confirmed: true })
  },
}
```

- [ ] **Step 3: Подключить в bootstrap**

В `backend/src/index.ts`:

```ts
import { configureEmailConfirmation } from './scripts/setup-email-confirmation'
```

и в `bootstrap` после `await configurePasswordReset(strapi)`:

```ts
await configureEmailConfirmation(strapi)
```

- [ ] **Step 4: Проверка**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: PASS

Ручная проверка: `docker compose up -d && pnpm --filter backend dev`, зарегистрироваться через `POST /api/auth/local/register` → ответ содержит `user` без `jwt`, письмо видно в Mailpit (http://localhost:8025), клик по ссылке → редирект на `{FRONTEND_URL}/email-confirmed`, после этого `POST /api/auth/local` выдаёт jwt.

- [ ] **Step 5: Commit**

```bash
git add backend/src/scripts/setup-email-confirmation.ts backend/database/migrations backend/src/index.ts
git commit -m "feat(backend): enable mandatory email confirmation on registration"
```

---

### Task 6: Email-верификация — frontend

**Files:**

- Modify: `frontend/src/stores/AuthStore.ts`
- Test: `frontend/src/stores/AuthStore.test.ts`
- Modify: `frontend/src/components/auth/EmailRegisterForm.tsx`
- Modify: `frontend/src/components/auth/EmailLoginForm.tsx`
- Create: `frontend/src/app/(auth)/email-confirmed/page.tsx`
- Modify: `frontend/src/services/api.ts` (маппинг ошибки)
- Modify: `frontend/src/locales/ru/common.json`, `frontend/src/locales/en/common.json`

- [ ] **Step 1: Падающие тесты AuthStore**

Добавить в `frontend/src/stores/AuthStore.test.ts` (по паттерну существующих тестов с mock fetch/api):

```ts
it('registerWithEmail без jwt в ответе включает pendingEmailConfirmation и не создаёт сессию', async () => {
  // mock api.post → { user: mockUser } (без jwt)
  const store = new AuthStore()
  await store.registerWithEmail('a@b.c', 'password', 'A', 'B')
  expect(store.pendingEmailConfirmation).toBe(true)
  expect(store.isAuthenticated).toBe(false)
})

it('registerWithEmail с jwt создаёт сессию (email confirmation выключена)', async () => {
  // mock api.post → { jwt: 'token', user: mockUser }
  const store = new AuthStore()
  await store.registerWithEmail('a@b.c', 'password', 'A', 'B')
  expect(store.isAuthenticated).toBe(true)
  expect(store.pendingEmailConfirmation).toBe(false)
})

it('resendConfirmation отправляет POST /auth/send-email-confirmation', async () => {
  const store = new AuthStore()
  await store.resendConfirmation('a@b.c')
  // assert: api.post вызван с ('/auth/send-email-confirmation', { email: 'a@b.c' })
})
```

(Точный синтаксис моков взять из существующих тестов файла.)

- [ ] **Step 2: Тесты падают**

Run: `pnpm --filter frontend test -- AuthStore`
Expected: FAIL — нет `pendingEmailConfirmation` / `resendConfirmation`

- [ ] **Step 3: AuthStore — реализация**

В `AuthStore`:

1. Новые observable-поля:

```ts
pendingEmailConfirmation = false
emailNotConfirmed = false
```

2. `registerWithEmail` — ответ стал `{ jwt?: string | null; user: User }`:

```ts
const res = await api.post<{ jwt?: string | null; user: User }>('/auth/local/register', {
  email,
  password,
  firstName,
  lastName,
})
if (res.jwt) {
  this._setSession(res.jwt, res.user)
} else {
  runInAction(() => {
    this.pendingEmailConfirmation = true
  })
}
```

3. `loginWithEmail` — в `catch` перед сохранением ошибки:

```ts
const notConfirmed =
  e instanceof ApiClientError &&
  ((e.data as { error?: { message?: string } })?.error?.message ?? '') ===
    'Your account email is not confirmed'
runInAction(() => {
  this.emailNotConfirmed = notConfirmed
  this.error = e instanceof Error ? e.message : 'Login failed'
})
```

4. Новый метод:

```ts
async resendConfirmation(email: string): Promise<void> {
  await api.post('/auth/send-email-confirmation', { email })
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm --filter frontend test -- AuthStore`
Expected: PASS

- [ ] **Step 5: Маппинг ошибки в api.ts**

В `API_ERROR_I18N_KEYS` (`frontend/src/services/api.ts`) добавить:

```ts
'Your account email is not confirmed': 'apiErrors.Your account email is not confirmed',
```

- [ ] **Step 6: EmailRegisterForm — экран «Проверьте почту»**

В `EmailRegisterForm.tsx`:

1. Сохранить отправленный email: `const [sentEmail, setSentEmail] = useState('')`, в `onSubmit` перед вызовом — `setSentEmail(data.email)`
2. Локальное состояние повторной отправки: `const [resent, setResent] = useState(false)`
3. Перед `return` формы:

```tsx
if (auth.pendingEmailConfirmation) {
  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-6 text-center">
      <p className="font-semibold">{t('auth.confirmEmailTitle')}</p>
      <p className="text-sm text-muted-foreground">
        {t('auth.confirmEmailDesc', { email: sentEmail })}
      </p>
      {resent ? (
        <p className="text-sm text-green-600">{t('auth.confirmEmailResent')}</p>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            void auth.resendConfirmation(sentEmail).then(() => setResent(true))
          }}
        >
          {t('auth.resendConfirmation')}
        </Button>
      )}
    </div>
  )
}
```

4. В `onSubmit` убрать `router.push('/')` только для случая без сессии — оставить как есть: после `await auth.registerWithEmail(...)` добавить условие:

```ts
if (!auth.pendingEmailConfirmation) router.push('/')
```

- [ ] **Step 7: EmailLoginForm — кнопка повторной отправки**

В `EmailLoginForm.tsx` после блока `{auth.error && ...}` добавить:

```tsx
{
  auth.emailNotConfirmed && (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        void auth.resendConfirmation(getValues('identifier'))
      }}
    >
      {t('auth.resendConfirmation')}
    </Button>
  )
}
```

`getValues` добавить в деструктуризацию `useForm`.

- [ ] **Step 8: Страница /email-confirmed**

`frontend/src/app/(auth)/email-confirmed/page.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function EmailConfirmedPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-2xl font-bold">{t('auth.emailConfirmedTitle')}</h1>
      <p className="text-muted-foreground">{t('auth.emailConfirmedDesc')}</p>
      <Button asChild>
        <Link href="/login">{t('auth.login')}</Link>
      </Button>
    </div>
  )
}
```

(Посмотреть, как оформлены существующие страницы в `(auth)/` — например `reset-password` — и переиспользовать их обёртку/Card, если есть.)

- [ ] **Step 9: Локали**

`locales/ru/common.json`, в `auth`:

```json
"confirmEmailTitle": "Проверьте почту",
"confirmEmailDesc": "Мы отправили письмо с подтверждением на {{email}}. Перейдите по ссылке в письме, чтобы завершить регистрацию.",
"confirmEmailResent": "Письмо отправлено повторно",
"resendConfirmation": "Отправить письмо ещё раз",
"emailConfirmedTitle": "Email подтверждён",
"emailConfirmedDesc": "Ваш адрес подтверждён. Теперь вы можете войти."
```

в `apiErrors`:

```json
"Your account email is not confirmed": "Email не подтверждён. Проверьте почту или отправьте письмо повторно."
```

`locales/en/common.json`, в `auth`:

```json
"confirmEmailTitle": "Check your email",
"confirmEmailDesc": "We sent a confirmation link to {{email}}. Follow the link to complete registration.",
"confirmEmailResent": "Email sent again",
"resendConfirmation": "Resend confirmation email",
"emailConfirmedTitle": "Email confirmed",
"emailConfirmedDesc": "Your email is confirmed. You can now sign in."
```

в `apiErrors`:

```json
"Your account email is not confirmed": "Email is not confirmed. Check your inbox or resend the email."
```

- [ ] **Step 10: Проверка + commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS

Ручная проверка: регистрация → экран «Проверьте почту» → письмо в Mailpit → клик → `/email-confirmed` → логин работает; логин до подтверждения → сообщение + кнопка повторной отправки.

```bash
git add frontend
git commit -m "feat(frontend): email confirmation flow on registration"
```

---

### Task 7: Аватар — upload, валидация, компонент UserAvatar

**Files:**

- Create: `backend/src/services/avatar-utils.ts`
- Test: `backend/src/services/avatar-utils.test.ts`
- Modify: `backend/src/extensions/users-permissions/strapi-server.ts`
- Modify: `backend/src/scripts/seed-permissions.ts`
- Modify: `frontend/src/services/api.ts`
- Create: `frontend/src/components/shared/UserAvatar.tsx`
- Test: `frontend/src/components/shared/UserAvatar.test.tsx`

- [ ] **Step 1: Падающие тесты валидации URL (backend)**

`backend/src/services/avatar-utils.test.ts`:

```ts
import { isAllowedAvatarUrl } from './avatar-utils'

describe('isAllowedAvatarUrl', () => {
  const OLD_ENV = process.env.S3_PUBLIC_URL
  beforeEach(() => {
    process.env.S3_PUBLIC_URL = 'http://localhost:9000/gramjob'
  })
  afterEach(() => {
    process.env.S3_PUBLIC_URL = OLD_ENV
  })

  it('разрешает null и пустую строку (сброс аватара)', () => {
    expect(isAllowedAvatarUrl(null)).toBe(true)
    expect(isAllowedAvatarUrl('')).toBe(true)
  })

  it('разрешает URL собственного uploads-хоста', () => {
    expect(isAllowedAvatarUrl('http://localhost:9000/gramjob/avatar_abc.png')).toBe(true)
  })

  it('разрешает Telegram photo_url', () => {
    expect(isAllowedAvatarUrl('https://t.me/i/userpic/320/abc.jpg')).toBe(true)
  })

  it('отклоняет чужие домены', () => {
    expect(isAllowedAvatarUrl('https://evil.example.com/x.png')).toBe(false)
  })

  it('отклоняет не-URL и не-строки', () => {
    expect(isAllowedAvatarUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedAvatarUrl(123)).toBe(false)
    expect(isAllowedAvatarUrl('not a url')).toBe(false)
  })
})
```

- [ ] **Step 2: Тесты падают**

Run: `pnpm --filter backend test -- avatar-utils`
Expected: FAIL

- [ ] **Step 3: Реализация avatar-utils**

`backend/src/services/avatar-utils.ts`:

```ts
const TELEGRAM_HOSTS = ['t.me', 'telegram.org']

export function isAllowedAvatarUrl(value: unknown): boolean {
  if (value === null || value === '') return true
  if (typeof value !== 'string') return false

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false

  const allowedHosts = [...TELEGRAM_HOSTS]
  const s3PublicUrl = process.env.S3_PUBLIC_URL
  if (s3PublicUrl) {
    try {
      allowedHosts.push(new URL(s3PublicUrl).hostname)
    } catch {
      // некорректный env — просто не добавляем хост
    }
  }

  return allowedHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `pnpm --filter backend test -- avatar-utils`
Expected: PASS

- [ ] **Step 5: Валидация в updateMe**

В `backend/src/extensions/users-permissions/strapi-server.ts`:

```ts
import { isAllowedAvatarUrl } from '../../services/avatar-utils'
```

В `plugin.controllers.user.updateMe` после `const safeData = pickFields(...)`:

```ts
if ('avatar' in safeData && !isAllowedAvatarUrl(safeData.avatar)) {
  return ctx.badRequest('avatar must be a URL from the uploads storage or Telegram')
}
```

- [ ] **Step 6: Permission на upload**

В `backend/src/scripts/seed-permissions.ts` в `AUTHENTICATED_PERMISSIONS` добавить:

```ts
  'plugin::upload.content-api.upload',
```

- [ ] **Step 7: uploadFile в api.ts (frontend)**

В `frontend/src/services/api.ts` добавить:

```ts
export interface UploadedFile {
  id: number
  url: string
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const headers: Record<string, string> = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const form = new FormData()
  form.append('files', file)

  // Без Content-Type: браузер сам выставит multipart boundary
  const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers, body: form })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const raw =
      (data as { error?: { message?: string } } | undefined)?.error?.message ?? res.statusText
    throw new ApiClientError(res.status, data, raw)
  }

  const files = (await res.json()) as UploadedFile[]
  const first = files[0]
  if (!first) throw new ApiClientError(500, files, 'Upload returned no files')
  return first
}
```

- [ ] **Step 8: Компонент UserAvatar + тест**

`frontend/src/components/shared/UserAvatar.tsx`:

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  user: { firstName?: string | null; email?: string | null; avatar?: string | null }
  className?: string
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const initial = (user.firstName?.charAt(0) ?? user.email?.charAt(0) ?? '?').toUpperCase()
  return (
    <Avatar className={cn('h-8 w-8', className)}>
      {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
```

Если `AvatarImage` не экспортируется из `components/ui/avatar.tsx` — добавить его туда (стандартный shadcn: `AvatarPrimitive.Image` с `className="aspect-square h-full w-full object-cover"`).

`frontend/src/components/shared/UserAvatar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserAvatar } from './UserAvatar'

describe('UserAvatar', () => {
  it('показывает инициал из firstName без аватара', () => {
    render(<UserAvatar user={{ firstName: 'ivan', email: 'a@b.c', avatar: null }} />)
    expect(screen.getByText('I')).toBeInTheDocument()
  })

  it('fallback на email при отсутствии имени', () => {
    render(<UserAvatar user={{ firstName: null, email: 'x@b.c', avatar: null }} />)
    expect(screen.getByText('X')).toBeInTheDocument()
  })
})
```

(Radix Avatar рендерит Image только после onLoad — в jsdom проверяем fallback-ветки.)

- [ ] **Step 9: Проверка + commit**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test && pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS

```bash
git add backend frontend
git commit -m "feat: user avatar upload with URL validation and UserAvatar component"
```

---

### Task 8: Тумблер Telegram-уведомлений (backend + типы)

**Files:**

- Modify: `backend/src/extensions/users-permissions/content-types/user/schema.json`
- Modify: `backend/src/extensions/users-permissions/strapi-server.ts`
- Modify: `backend/src/services/notification.service.ts`
- Test: `backend/src/services/notification.service.test.ts` (если существует — дополнить; иначе проверка через существующие тесты)
- Modify: `backend/types/generated/contentTypes.d.ts`
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Поле в схеме User**

В `schema.json` в `attributes` после `isVip` добавить:

```json
"telegramNotificationsEnabled": {
  "type": "boolean",
  "default": true
}
```

- [ ] **Step 2: allowlist + SAFE_RESPONSE_FIELDS**

В `strapi-server.ts` добавить `'telegramNotificationsEnabled'`:

- в массив `SAFE_RESPONSE_FIELDS` (после `'isVip'`)
- в массив `ALLOWED_UPDATE_FIELDS` (после `'avatar'`)

- [ ] **Step 3: contentTypes.d.ts**

В интерфейс `PluginUsersPermissionsUser` добавить (рядом с `isVip`):

```ts
telegramNotificationsEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>
```

(Синтаксис скопировать по образцу соседнего boolean-поля `isVip`.)

- [ ] **Step 4: Проверка флага в notification.service**

В `sendNotification` (блок «2. Send Telegram message»):

```ts
const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
  where: { id: userId },
  select: ['telegramId', 'telegramNotificationsEnabled'],
})) as { telegramId?: string | null; telegramNotificationsEnabled?: boolean | null } | null

if (user?.telegramId && user.telegramNotificationsEnabled !== false) {
  sendMessage(user.telegramId, message)
}
```

(`!== false`: у существующих пользователей поле может быть NULL до первого сохранения — NULL трактуем как «включено».)

- [ ] **Step 5: Тип User (frontend)**

В `frontend/src/types/api.ts` в `interface User` после `isVip`:

```ts
telegramNotificationsEnabled: boolean
```

Если тесты используют мок User (например `AuthStore.test.ts` `avatar: null,`) — добавить поле в моки.

- [ ] **Step 6: Проверка + commit**

Run: `pnpm --filter backend typecheck && pnpm --filter backend test && pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS

```bash
git add backend frontend
git commit -m "feat: telegramNotificationsEnabled user flag gating Telegram messages"
```

---

### Task 9: Header — избранное, подписка, меню пользователя

**Files:**

- Modify: `frontend/src/components/layout/WebHeader.tsx`
- Test: `frontend/src/components/layout/WebHeader.test.tsx` (если существует — обновить)

- [ ] **Step 1: Ссылка «Подписка» в навигации**

В блоке `hidden items-center gap-1 md:flex` после ссылки «Мои резюме» (блок `auth.isAuthenticated && ...`) добавить:

```tsx
{
  auth.isAuthenticated && (
    <Link
      href="/subscription"
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        pathname.startsWith('/subscription')
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
    >
      {t('nav.subscription')}
    </Link>
  )
}
```

- [ ] **Step 2: Кнопка «Избранное»**

Импортировать `Heart` из `lucide-react`. Сразу после `<NotificationBadge />` добавить:

```tsx
<Button asChild variant="ghost" size="icon" className="h-8 w-8">
  <Link href="/dashboard/favorites" aria-label={t('nav.favorites')}>
    <Heart className="h-4 w-4" />
  </Link>
</Button>
```

- [ ] **Step 3: Переработать шапку dropdown**

Импортировать `UserAvatar` из `@/components/shared/UserAvatar`; убрать импорт `DropdownMenuLabel` и иконку `User`, если больше не используются.

1. Триггер: заменить `<Avatar>...</Avatar>` внутри кнопки-триггера на:

```tsx
<UserAvatar user={auth.user} />
```

2. Заменить блок `<DropdownMenuLabel>...</DropdownMenuLabel>` на:

```tsx
<div className="flex items-center justify-between gap-1">
  <DropdownMenuItem asChild className="min-w-0 flex-1">
    <Link href="/dashboard/profile">
      <UserAvatar user={auth.user} className="mr-2 h-5 w-5" />
      <span className="min-w-0 truncate">
        {auth.user.firstName ?? auth.user.email}
        {auth.user.lastName ? ` ${auth.user.lastName}` : ''}
      </span>
    </Link>
  </DropdownMenuItem>
  <DropdownMenuItem asChild>
    <Link href="/subscription">
      <SubscriptionBadge plan={auth.user.subscriptionPlan} />
    </Link>
  </DropdownMenuItem>
</div>
```

`DropdownMenuItem` даёт те же отступы (`px-2 py-1.5`) и шрифт (`text-sm`), что и остальные пункты — требования по консистентности выполняются автоматически; клик закрывает меню.

- [ ] **Step 4: Проверка + commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS (обновить WebHeader-тесты, если они проверяли DropdownMenuLabel)

Ручная проверка в браузере: иконка ♥ ведёт на избранное; «Подписка» в навигации; в dropdown аватар+имя кликабельны → /dashboard/profile; бейдж плана → /subscription.

```bash
git add frontend
git commit -m "feat(frontend): header favorites button, subscription nav, user menu links"
```

---

### Task 10: Редизайн «Мой кабинет»

**Files:**

- Create: `frontend/src/components/subscription/SubscriptionBanner.tsx`
- Test: `frontend/src/components/subscription/SubscriptionBanner.test.tsx`
- Modify: `frontend/src/app/dashboard/DashboardClient.tsx`
- Modify: `frontend/src/app/dashboard/DashboardClient.test.tsx`
- Modify: `frontend/src/locales/ru/common.json`, `frontend/src/locales/en/common.json`

- [ ] **Step 1: Падающий тест SubscriptionBanner**

`frontend/src/components/subscription/SubscriptionBanner.test.tsx` (мок сторов — по паттерну существующих компонент-тестов проекта, например `DashboardClient.test.tsx`):

```tsx
// Мокаем useStores так же, как в DashboardClient.test.tsx
it('показывается для free', () => {
  // auth.user.subscriptionPlan = 'free'
  render(<SubscriptionBanner />)
  expect(screen.getByRole('link')).toHaveAttribute('href', '/subscription')
})

it('показывается для pro', () => {
  // auth.user.subscriptionPlan = 'pro'
  render(<SubscriptionBanner />)
  expect(screen.getByRole('link')).toBeInTheDocument()
})

it('не показывается для max и vip', () => {
  // auth.user.subscriptionPlan = 'max'
  const { container } = render(<SubscriptionBanner />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Тест падает**

Run: `pnpm --filter frontend test -- SubscriptionBanner`
Expected: FAIL

- [ ] **Step 3: Реализация SubscriptionBanner**

```tsx
'use client'

import Link from 'next/link'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'

export const SubscriptionBanner = observer(function SubscriptionBanner() {
  const { auth } = useStores()
  const { t } = useTranslation()

  const plan = auth.user?.subscriptionPlan
  if (plan !== 'free' && plan !== 'pro') return null

  return (
    <Link href="/subscription" className="group block">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-violet-600 p-4 text-primary-foreground shadow-sm transition-shadow group-hover:shadow-md sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Sparkles className="h-6 w-6 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">{t('dashboard.banner.title')}</p>
            <p className="truncate text-sm opacity-90">{t('dashboard.banner.desc')}</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
})
```

- [ ] **Step 4: Тест зелёный**

Run: `pnpm --filter frontend test -- SubscriptionBanner`
Expected: PASS

- [ ] **Step 5: Переработать DashboardClient**

В `DashboardClient.tsx`:

1. Удалить из `SECTIONS` объекты с `href`: `/dashboard/favorites`, `/dashboard/notifications`, `/subscription`, `/dashboard/profile` (saved-searches удалён в Task 2). Удалить неиспользуемые импорты иконок (`Heart`, `Bell`, `Star`, `User`) и `badge: 'unread'`-логику вместе с `notification`-стором, если он больше не нужен (useEffect с `fetchUnreadCount` удалить).
2. Заголовок:

```tsx
<div>
  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboard.title')}</h1>
  <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.greetingDesc')}</p>
</div>
```

(`dashboard.greeting` из локалей удалить, `SubscriptionBadge`-ссылку в шапке оставить.)

3. После `<section aria-label={t('dashboard.quickActions')} ...>` вставить баннер:

```tsx
<SubscriptionBanner />
```

(+ импорт).

4. Компактная сетка секций:

```tsx
<section
  aria-label={t('dashboard.sections')}
  className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3"
>
  {SECTIONS.map(({ href, icon: Icon, label, desc }) => (
    <Link key={href} href={href} className="group">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="flex items-start gap-3 p-3 sm:p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold group-hover:text-primary sm:text-base">
              {label}
            </p>
            <p className="mt-0.5 hidden truncate text-sm text-muted-foreground sm:block">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  ))}
</section>
```

5. Уменьшить вертикальные отступы: корневой `div` — `space-y-6` вместо `space-y-8`.

- [ ] **Step 6: Локали**

RU `dashboard`:

```json
"title": "Мой кабинет",
"banner": {
  "title": "Больше возможностей с Pro и Max",
  "desc": "Больше вакансий, бустов и доступ к базе резюме"
}
```

EN `dashboard`:

```json
"title": "My Account",
"banner": {
  "title": "Unlock more with Pro and Max",
  "desc": "More vacancies, boosts and resume database access"
}
```

Удалить ключ `dashboard.greeting` (RU/EN) и ключи удалённых секций из `dashboard.sections_list` (`favorites`, `notifications`, `subscription`, `profile`) — предварительно проверив grep'ом, что они не используются в других местах.

- [ ] **Step 7: Обновить DashboardClient.test.tsx**

Поправить assertions: заголовок «Мой кабинет» (или ключ `dashboard.title` — в зависимости от того, как тест работает с i18n), удалённые секции не рендерятся, баннер присутствует для free-пользователя.

- [ ] **Step 8: Проверка + commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test`
Expected: PASS

Ручная проверка в браузере (mobile viewport ~375px): 2 колонки, компактные карточки, баннер, заголовок.

```bash
git add frontend
git commit -m "feat(frontend): redesign dashboard — compact grid, subscription banner"
```

---

### Task 11: Страница «Настройки» (/dashboard/profile)

**Files:**

- Create: `frontend/src/components/settings/SettingsNav.tsx`
- Create: `frontend/src/components/settings/ProfileSettingsForm.tsx`
- Create: `frontend/src/components/settings/AvatarUploader.tsx`
- Create: `frontend/src/components/settings/TelegramNotificationsToggle.tsx`
- Create: `frontend/src/components/settings/ChangePasswordForm.tsx`
- Create: `frontend/src/app/dashboard/profile/layout.tsx`
- Create: `frontend/src/app/dashboard/profile/security/page.tsx`
- Modify: `frontend/src/app/dashboard/profile/ProfileClient.tsx` (полная замена)
- Modify: `frontend/src/app/dashboard/profile/ProfileClient.test.tsx` (полная замена)
- Modify: `frontend/src/stores/AuthStore.ts` + `AuthStore.test.ts`
- Modify: `backend/src/scripts/seed-permissions.ts` (permission change-password)
- Modify: `frontend/src/locales/ru/common.json`, `frontend/src/locales/en/common.json`

- [ ] **Step 1: Permission на смену пароля (backend)**

В `backend/src/scripts/seed-permissions.ts` в `AUTHENTICATED_PERMISSIONS` добавить:

```ts
  'plugin::users-permissions.auth.changePassword',
```

Commit вместе с фронтом в конце задачи.

- [ ] **Step 2: Падающие тесты AuthStore**

В `AuthStore.test.ts` добавить:

```ts
it('updateProfile обновляет user из ответа PUT /users/me', async () => {
  // mock api.put → { ...mockUser, firstName: 'New' }
  const store = new AuthStore()
  // предустановить store.user = mockUser (через мок login или прямое присваивание в runInAction)
  await store.updateProfile({ firstName: 'New' })
  expect(store.user?.firstName).toBe('New')
})

it('changePassword устанавливает новую сессию из ответа', async () => {
  // mock api.post('/auth/change-password') → { jwt: 'new-token', user: mockUser }
  const store = new AuthStore()
  await store.changePassword('old', 'new123', 'new123')
  expect(store.jwt).toBe('new-token')
})
```

Run: `pnpm --filter frontend test -- AuthStore` → FAIL

- [ ] **Step 3: AuthStore — новые методы**

```ts
async updateProfile(data: {
  firstName?: string
  lastName?: string
  avatar?: string | null
  telegramNotificationsEnabled?: boolean
}): Promise<void> {
  const user = await api.put<User>('/users/me', data)
  runInAction(() => {
    this.user = this.user ? { ...this.user, ...user } : user
  })
}

async changePassword(
  currentPassword: string,
  password: string,
  passwordConfirmation: string
): Promise<void> {
  const res = await api.post<AuthResponse>('/auth/change-password', {
    currentPassword,
    password,
    passwordConfirmation,
  })
  this._setSession(res.jwt, res.user)
}
```

Run: `pnpm --filter frontend test -- AuthStore` → PASS

- [ ] **Step 4: SettingsNav**

`frontend/src/components/settings/SettingsNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { LogOut, Shield, Star, User } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { cn } from '@/lib/utils'

// Расширение настроек: добавить объект сюда + route segment в app/dashboard/profile/
const NAV_ITEMS = [
  { key: 'profile', href: '/dashboard/profile', icon: User, exact: true },
  { key: 'security', href: '/dashboard/profile/security', icon: Shield, requiresEmail: true },
  { key: 'subscription', href: '/subscription', icon: Star },
] as const

export const SettingsNav = observer(function SettingsNav() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { auth } = useStores()

  const items = NAV_ITEMS.filter(
    (item) => !('requiresEmail' in item && item.requiresEmail) || Boolean(auth.user?.email)
  )

  const itemClasses = (active: boolean) =>
    cn(
      'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
    )

  return (
    <nav className="flex gap-1 overflow-x-auto md:w-56 md:shrink-0 md:flex-col md:overflow-visible">
      {items.map(({ key, href, icon: Icon, ...rest }) => {
        const active = 'exact' in rest && rest.exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link key={key} href={href} className={itemClasses(active)}>
            <Icon className="h-4 w-4 shrink-0" />
            {t(`settings.nav.${key}`)}
          </Link>
        )
      })}
      <button
        type="button"
        className={itemClasses(false)}
        onClick={() => {
          auth.logout()
          router.push('/')
        }}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {t('settings.nav.logout')}
      </button>
    </nav>
  )
})
```

- [ ] **Step 5: Layout настроек**

`frontend/src/app/dashboard/profile/layout.tsx`:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('settings.title')}</h1>
      <div className="flex flex-col gap-6 md:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: AvatarUploader**

`frontend/src/components/settings/AvatarUploader.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { uploadFile } from '@/services/api'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'

export const AvatarUploader = observer(function AvatarUploader() {
  const { auth } = useStores()
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!auth.user) return null

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const uploaded = await uploadFile(file)
      await auth.updateProfile({ avatar: uploaded.url })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.profile.avatarError'))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar user={auth.user} className="h-16 w-16 text-xl" />
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void onFileChange(e)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? t('common.loading') : t('settings.profile.changeAvatar')}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
})
```

- [ ] **Step 7: ProfileSettingsForm**

`frontend/src/components/settings/ProfileSettingsForm.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const _baseSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})

type FormData = z.infer<typeof _baseSchema>

export const ProfileSettingsForm = observer(function ProfileSettingsForm() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, t('auth.validation.enterFirstName')),
        lastName: z.string().min(1, t('auth.validation.enterLastName')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: auth.user?.firstName ?? '',
      lastName: auth.user?.lastName ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setSaved(false)
    setError(null)
    try {
      await auth.updateProfile(data)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.profile.saveError'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t('auth.firstName')}</Label>
          <Input id="firstName" {...register('firstName')} />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t('auth.lastName')}</Label>
          <Input id="lastName" {...register('lastName')} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      {auth.user?.email && <p className="text-sm text-muted-foreground">{auth.user.email}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">{t('settings.profile.saved')}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('common.loading') : t('settings.profile.save')}
      </Button>
    </form>
  )
})
```

- [ ] **Step 8: TelegramNotificationsToggle**

Radix Switch не установлен — используем существующий `Checkbox`:

`frontend/src/components/settings/TelegramNotificationsToggle.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export const TelegramNotificationsToggle = observer(function TelegramNotificationsToggle() {
  const { auth } = useStores()
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)

  if (!auth.user?.telegramId) return null

  const enabled = auth.user.telegramNotificationsEnabled !== false

  const toggle = async (checked: boolean) => {
    setIsSaving(true)
    try {
      await auth.updateProfile({ telegramNotificationsEnabled: checked })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="tg-notifications"
        checked={enabled}
        disabled={isSaving}
        onCheckedChange={(checked) => void toggle(checked === true)}
      />
      <Label htmlFor="tg-notifications" className="cursor-pointer">
        {t('settings.profile.telegramNotifications')}
      </Label>
    </div>
  )
})
```

- [ ] **Step 9: ProfileClient — полная замена**

`frontend/src/app/dashboard/profile/ProfileClient.tsx`:

```tsx
'use client'

import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AvatarUploader } from '@/components/settings/AvatarUploader'
import { ProfileSettingsForm } from '@/components/settings/ProfileSettingsForm'
import { TelegramNotificationsToggle } from '@/components/settings/TelegramNotificationsToggle'

export const ProfileClient = observer(function ProfileClient() {
  const { t } = useTranslation()
  const { auth } = useStores()
  useRequireAuth()

  if (!auth.user) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.nav.profile')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AvatarUploader />
          <ProfileSettingsForm />
          <TelegramNotificationsToggle />
        </CardContent>
      </Card>
    </div>
  )
})
```

(Проверить `frontend/src/app/dashboard/profile/page.tsx` — он должен просто рендерить `<ProfileClient />`; менять не нужно.)

- [ ] **Step 10: ChangePasswordForm + страница security**

`frontend/src/components/settings/ChangePasswordForm.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const _baseSchema = z.object({
  currentPassword: z.string().min(6),
  password: z.string().min(6),
  passwordConfirmation: z.string(),
})

type FormData = z.infer<typeof _baseSchema>

export const ChangePasswordForm = observer(function ChangePasswordForm() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(6, t('auth.validation.minPassword')),
          password: z.string().min(6, t('auth.validation.minPassword')),
          passwordConfirmation: z.string(),
        })
        .refine((d) => d.password === d.passwordConfirmation, {
          message: t('auth.validation.passwordsNotMatch'),
          path: ['passwordConfirmation'],
        }),
    [t]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setSaved(false)
    setError(null)
    try {
      await auth.changePassword(data.currentPassword, data.password, data.passwordConfirmation)
      setSaved(true)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.security.changeError'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">{t('settings.security.currentPassword')}</Label>
        <Input id="currentPassword" type="password" {...register('currentPassword')} />
        {errors.currentPassword && (
          <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t('settings.security.newPassword')}</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="passwordConfirmation">{t('auth.confirmPassword')}</Label>
        <Input id="passwordConfirmation" type="password" {...register('passwordConfirmation')} />
        {errors.passwordConfirmation && (
          <p className="text-sm text-destructive">{errors.passwordConfirmation.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">{t('settings.security.changed')}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('common.loading') : t('settings.security.change')}
      </Button>
    </form>
  )
})
```

`frontend/src/app/dashboard/profile/security/page.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm'

const SecurityPage = observer(function SecurityPage() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const router = useRouter()
  useRequireAuth()

  // Telegram-only пользователям (без email) менять нечего — уводим на главный экран настроек
  useEffect(() => {
    if (auth.isAuthenticated && !auth.user?.email) router.replace('/dashboard/profile')
  }, [auth.isAuthenticated, auth.user, router])

  if (!auth.user?.email) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('settings.nav.security')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  )
})

export default SecurityPage
```

- [ ] **Step 11: Локали настроек**

RU (новый top-level ключ `settings`):

```json
"settings": {
  "title": "Настройки",
  "nav": {
    "profile": "Данные профиля",
    "security": "Безопасность",
    "subscription": "Подписка",
    "logout": "Выйти"
  },
  "profile": {
    "save": "Сохранить",
    "saved": "Сохранено",
    "saveError": "Не удалось сохранить",
    "changeAvatar": "Сменить аватар",
    "avatarError": "Не удалось загрузить аватар",
    "telegramNotifications": "Telegram-уведомления"
  },
  "security": {
    "currentPassword": "Текущий пароль",
    "newPassword": "Новый пароль",
    "change": "Сменить пароль",
    "changed": "Пароль изменён",
    "changeError": "Не удалось сменить пароль"
  }
}
```

EN:

```json
"settings": {
  "title": "Settings",
  "nav": {
    "profile": "Profile",
    "security": "Security",
    "subscription": "Subscription",
    "logout": "Log out"
  },
  "profile": {
    "save": "Save",
    "saved": "Saved",
    "saveError": "Failed to save",
    "changeAvatar": "Change avatar",
    "avatarError": "Failed to upload avatar",
    "telegramNotifications": "Telegram notifications"
  },
  "security": {
    "currentPassword": "Current password",
    "newPassword": "New password",
    "change": "Change password",
    "changed": "Password changed",
    "changeError": "Failed to change password"
  }
}
```

Ключи `dashboard.profile.links.*` и `dashboard.profile.logout` удалить (RU/EN), убедившись grep'ом, что не используются.

- [ ] **Step 12: Переписать ProfileClient.test.tsx**

Заменить содержимое: тест по паттерну прочих клиент-тестов (мок useStores) — рендер формы с полями firstName/lastName, наличие кнопки «Сменить аватар», отсутствие TelegramNotificationsToggle при `telegramId: null` и наличие при `telegramId: '123'`.

- [ ] **Step 13: Проверка + commit**

Run: `pnpm --filter frontend typecheck && pnpm --filter frontend test && pnpm --filter backend typecheck && pnpm --filter backend test`
Expected: PASS

Ручная проверка в браузере: desktop — sidebar слева; mobile — горизонтальные табы; форма сохраняет имя; аватар загружается и появляется в header; тумблер виден только у Telegram-пользователя; смена пароля работает (и раздел скрыт у Telegram-only); «Выйти» разлогинивает; в Mini App вкладка «Профиль» открывает настройки.

```bash
git add backend frontend
git commit -m "feat: settings page with profile, avatar, security and telegram toggle"
```

---

### Task 12: Финальная верификация

- [ ] **Step 1: Полные прогоны**

```bash
pnpm --filter backend typecheck && pnpm --filter backend test
pnpm --filter frontend typecheck && pnpm --filter frontend test
pnpm --filter frontend lint && pnpm --filter backend lint
```

Expected: всё PASS

- [ ] **Step 2: Ручной e2e-прогон (dev-окружение)**

`docker compose up -d`, `pnpm --filter backend dev`, `pnpm --filter frontend dev`:

1. Регистрация email → «Проверьте почту» → Mailpit → подтверждение → `/email-confirmed` → логин
2. Логин до подтверждения → ошибка + повторная отправка
3. Первое открытие в чистом браузере (инкогнито) → язык по navigator.language, записан в localStorage
4. Header: ♥ → избранное, «Подписка» в навигации, dropdown: аватар/имя → настройки, бейдж → подписка
5. «Мой кабинет»: заголовок, 6 секций, баннер (free), компактность на 375px
6. Настройки: имя, аватар (виден в header после загрузки), тумблер, смена пароля, выход
7. Отправить вакансию на модерацию → сообщение в админ-чат Telegram (при заполненном `ADMIN_TELEGRAM_CHAT_IDS`)
8. Сохранённых поисков нигде нет (поиск по UI, прямой заход на `/dashboard/saved-searches` → 404)

- [ ] **Step 3: Обновить CLAUDE.md**

Добавить секцию «Выполнено (Account & UX Batch)» с кратким перечнем изменений по образцу предыдущих секций и обновить строку «Текущий шаг».

- [ ] **Step 4: Финальный commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark account & UX batch as done in session context"
```
