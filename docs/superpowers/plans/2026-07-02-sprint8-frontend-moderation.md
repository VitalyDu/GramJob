# Sprint 8 Frontend (Moderation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пользователи видят результат модерации своих публикаций (вакансий, резюме, компаний): причину отклонения, что делать дальше, кнопку повторной отправки и toast-уведомления о смене статуса.

**Architecture:** Backend уже поддерживает resubmit (rejected → moderation) и хранит `rejectionReason`/`rejectionComment` — нужно лишь отдать эти поля в owner-эндпоинтах. Frontend получает: утилиту меток причин, компонент `RejectionNotice`, интеграцию в 3 существующих дашборда, новую сводную страницу `/dashboard/publications`, toast-систему (sonner) и polling-watcher непрочитанных moderation-уведомлений.

**Tech Stack:** Strapi 5 (documents API), Next.js 15 App Router, MobX, sonner, Vitest + Testing Library.

**Решения (согласованы с пользователем 2026-07-02):**

- «Мои публикации» — новая сводная страница `/dashboard/publications`; существующие дашборды дополняются блоком причины отклонения.
- Toast — библиотека **sonner**.
- Toast о смене статуса модерации — **polling** `GET /notifications?isRead=false` раз в 60 секунд.

**Конвенции проекта (обязательны):**

- Коммиты **без** `Co-Authored-By`.
- `exactOptionalPropertyTypes: true` — опциональные поля передавать через conditional spread `...(x ? { field: x } : {})`.
- Тесты: Vitest + `@testing-library/react`, описания на русском (см. `frontend/src/components/company/StatusBadge.test.tsx`).
- Тексты UI дашбордов — хардкод на русском (как в существующих клиентах); WebHeader — через i18next.

---

## Контекст: что уже есть (проверено 2026-07-02)

| Что                                                                       | Где                                                                                                                                                                                   | Статус    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 8 причин отклонения                                                       | `backend/src/services/moderation-utils.ts:1-23` (`spam`, `fake`, `inappropriate`, `incomplete`, `wrong_category`, `salary_mismatch`, `contact_info`, `other`)                         | ✅ есть   |
| Поля `rejectionReason`/`rejectionComment` в схемах Vacancy/Resume/Company | backend content-types                                                                                                                                                                 | ✅ есть   |
| Resubmit rejected → moderation                                            | `canPublish` (vacancy: draft/rejected/expired), `canPublishResume` (draft/rejected), `canSubmit` company (draft/rejected) — фронт-кнопки «На модерацию» уже показываются для rejected | ✅ есть   |
| Уведомления `moderation_approved` / `moderation_rejected`                 | `NotificationType` в `frontend/src/types/api.ts:571-587`, backend lifecycles                                                                                                          | ✅ есть   |
| Отдача rejection-полей владельцу                                          | `findMine`/`findMineById` контроллеров — используют field-списки БЕЗ rejection-полей                                                                                                  | ❌ Task 1 |
| Rejection-поля во frontend-типах                                          | `frontend/src/types/api.ts`                                                                                                                                                           | ❌ Task 2 |
| Toast-система                                                             | нет нигде                                                                                                                                                                             | ❌ Task 4 |

---

### Task 1: Backend — отдавать rejectionReason/rejectionComment в owner-эндпоинтах

Причина отклонения должна быть видна только владельцу, поэтому добавляем поля ТОЛЬКО в owner-эндпоинты (`findMine`, `findMineById`), не трогая публичные field-списки.

**Files:**

- Modify: `backend/src/api/vacancy/controllers/vacancy.ts` (константы ~строка 57, `findMineById` ~615, `findMine` ~641)
- Modify: `backend/src/api/resume/controllers/resume.ts` (`findMine` ~359)
- Modify: `backend/src/api/company/controllers/company.ts` (`findMineById` ~338, `findMine` ~380)

- [ ] **Step 1: Vacancy — owner-списки полей**

В `backend/src/api/vacancy/controllers/vacancy.ts` после объявления `VACANCY_FULL_FIELDS` (строка ~71) добавить:

```ts
const REJECTION_FIELDS = ['rejectionReason', 'rejectionComment'] as const

const VACANCY_OWNER_CARD_FIELDS = [...VACANCY_CARD_FIELDS, ...REJECTION_FIELDS] as const
const VACANCY_OWNER_FULL_FIELDS = [...VACANCY_FULL_FIELDS, ...REJECTION_FIELDS] as const
```

В `findMineById` заменить `fields: VACANCY_FULL_FIELDS as any` → `fields: VACANCY_OWNER_FULL_FIELDS as any`.
В `findMine` заменить `fields: VACANCY_CARD_FIELDS as any` → `fields: VACANCY_OWNER_CARD_FIELDS as any`.
Остальные использования `VACANCY_CARD_FIELDS`/`VACANCY_FULL_FIELDS` (публичные endpoints, create/update/publish-ответы) НЕ трогать.

- [ ] **Step 2: Resume — owner-список полей**

В `backend/src/api/resume/controllers/resume.ts` после `RESUME_FULL_FIELDS` (строка ~41) добавить:

```ts
const RESUME_OWNER_CARD_FIELDS = [
  ...RESUME_CARD_FIELDS,
  'rejectionReason',
  'rejectionComment',
] as const
```

В `findMine` заменить `fields: RESUME_CARD_FIELDS as any` → `fields: RESUME_OWNER_CARD_FIELDS as any`.

- [ ] **Step 3: Company — добавить поля в оба owner-эндпоинта**

В `backend/src/api/company/controllers/company.ts`:

В `findMineById` (fields-массив ~строка 338) добавить в конец массива:

```ts
          'status',
          'createdAt',
          'rejectionReason',
          'rejectionComment',
```

В `findMine` (fields-массив ~строка 380) аналогично добавить `'rejectionReason', 'rejectionComment'` после `'createdAt'`.

- [ ] **Step 4: Проверка**

Run: `cd backend && pnpm typecheck && pnpm test`
Expected: 0 ошибок TypeScript, все существующие тесты проходят (контроллеры в проекте покрываются typecheck + ручной проверкой, unit-тесты — только для utils/services; новых тестов здесь не требуется).

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/vacancy/controllers/vacancy.ts backend/src/api/resume/controllers/resume.ts backend/src/api/company/controllers/company.ts
git commit -m "feat(moderation): expose rejectionReason/rejectionComment in owner endpoints"
```

---

### Task 2: Frontend — типы rejection-полей

**Files:**

- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Добавить union причин**

В `frontend/src/types/api.ts` перед секцией `// --- Vacancy ---` (строка ~127) добавить:

```ts
// --- Moderation ---

export type ModerationRejectionReason =
  | 'spam'
  | 'fake'
  | 'inappropriate'
  | 'incomplete'
  | 'wrong_category'
  | 'salary_mismatch'
  | 'contact_info'
  | 'other'
```

- [ ] **Step 2: Добавить поля в интерфейсы**

В `interface Company` (после `status: CompanyStatusEnum`, строка ~99):

```ts
  rejectionReason?: ModerationRejectionReason | null
  rejectionComment?: string | null
```

То же самое в `interface Vacancy` (после `status: VacancyStatusEnum`, строка ~194) и в `interface Resume` (после `status: ResumeStatusEnum`, строка ~320).

- [ ] **Step 3: Проверка и commit**

Run: `cd frontend && pnpm typecheck`
Expected: 0 ошибок.

```bash
git add frontend/src/types/api.ts
git commit -m "feat(moderation): add rejection fields to Vacancy/Resume/Company types"
```

---

### Task 3: Frontend — moderation-utils (метки причин)

**Files:**

- Create: `frontend/src/lib/moderation-utils.ts`
- Test: `frontend/src/lib/moderation-utils.test.ts`

- [ ] **Step 1: Написать падающий тест**

`frontend/src/lib/moderation-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { REJECTION_REASON_LABELS, getRejectionReasonLabel } from './moderation-utils'

describe('moderation-utils', () => {
  it('содержит метки для всех 8 причин', () => {
    expect(Object.keys(REJECTION_REASON_LABELS)).toHaveLength(8)
  })

  it('возвращает метку для известной причины', () => {
    expect(getRejectionReasonLabel('spam')).toBe('Спам или дублирующийся контент')
    expect(getRejectionReasonLabel('incomplete')).toBe('Недостаточно информации')
  })

  it('возвращает метку для "other"', () => {
    expect(getRejectionReasonLabel('other')).toBe('Другое')
  })

  it('возвращает fallback для неизвестной причины', () => {
    expect(getRejectionReasonLabel('unknown_reason')).toBe('См. комментарий модератора')
  })

  it('возвращает fallback для null и undefined', () => {
    expect(getRejectionReasonLabel(null)).toBe('См. комментарий модератора')
    expect(getRejectionReasonLabel(undefined)).toBe('См. комментарий модератора')
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd frontend && pnpm test -- src/lib/moderation-utils.test.ts`
Expected: FAIL — `Cannot find module './moderation-utils'` (или аналогичная ошибка).

- [ ] **Step 3: Реализация**

`frontend/src/lib/moderation-utils.ts` (метки идентичны backend `moderation-utils.ts:14-23`):

```ts
import type { ModerationRejectionReason } from '@/types/api'

export const REJECTION_REASON_LABELS: Record<ModerationRejectionReason, string> = {
  spam: 'Спам или дублирующийся контент',
  fake: 'Фиктивная вакансия/компания',
  inappropriate: 'Неприемлемый контент',
  incomplete: 'Недостаточно информации',
  wrong_category: 'Неправильная категория',
  salary_mismatch: 'Некорректные данные о зарплате',
  contact_info: 'Контактные данные в запрещённых полях',
  other: 'Другое',
}

export function getRejectionReasonLabel(reason?: string | null): string {
  if (reason && reason in REJECTION_REASON_LABELS) {
    return REJECTION_REASON_LABELS[reason as ModerationRejectionReason]
  }
  return 'См. комментарий модератора'
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `cd frontend && pnpm test -- src/lib/moderation-utils.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/moderation-utils.ts frontend/src/lib/moderation-utils.test.ts
git commit -m "feat(moderation): rejection reason labels utility"
```

---

### Task 4: sonner + Toaster в AppShell

**Files:**

- Modify: `frontend/package.json` (через pnpm add)
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Установить sonner**

Run: `cd frontend && pnpm add sonner`
Expected: sonner появляется в dependencies.

- [ ] **Step 2: Подключить Toaster**

`frontend/src/components/layout/AppShell.tsx` — добавить импорт и компонент:

```tsx
'use client'

import { type ReactNode } from 'react'
import { Toaster } from 'sonner'
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
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}
```

- [ ] **Step 3: Проверка и commit**

Run: `cd frontend && pnpm typecheck && pnpm test`
Expected: 0 ошибок, все тесты зелёные.

```bash
git add frontend/package.json pnpm-lock.yaml frontend/src/components/layout/AppShell.tsx
git commit -m "feat(ui): add sonner toast system"
```

---

### Task 5: Компонент RejectionNotice

Блок под карточкой отклонённой публикации: причина + комментарий модератора + что делать + кнопки «Исправить» (→ edit) и «Отправить повторно» (→ resubmit). Гейт по `status === 'rejected'` делает вызывающий код.

**Files:**

- Create: `frontend/src/components/moderation/RejectionNotice.tsx`
- Test: `frontend/src/components/moderation/RejectionNotice.test.tsx`

- [ ] **Step 1: Написать падающий тест**

`frontend/src/components/moderation/RejectionNotice.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RejectionNotice } from './RejectionNotice'

describe('RejectionNotice', () => {
  it('отображает метку причины отклонения', () => {
    render(<RejectionNotice reason="spam" editHref="/edit" onResubmit={() => {}} />)
    expect(screen.getByText(/Спам или дублирующийся контент/)).toBeDefined()
  })

  it('отображает комментарий модератора, если он есть', () => {
    render(
      <RejectionNotice
        reason="other"
        comment="Уберите ссылки из описания"
        editHref="/edit"
        onResubmit={() => {}}
      />
    )
    expect(screen.getByText(/Уберите ссылки из описания/)).toBeDefined()
  })

  it('не отображает блок комментария, если комментария нет', () => {
    render(<RejectionNotice reason="spam" editHref="/edit" onResubmit={() => {}} />)
    expect(screen.queryByText(/Комментарий модератора/)).toBeNull()
  })

  it('содержит ссылку «Исправить» на editHref', () => {
    render(
      <RejectionNotice
        reason="spam"
        editHref="/dashboard/vacancies/abc/edit"
        onResubmit={() => {}}
      />
    )
    const link = screen.getByRole('link', { name: 'Исправить' })
    expect(link.getAttribute('href')).toBe('/dashboard/vacancies/abc/edit')
  })

  it('вызывает onResubmit по кнопке «Отправить повторно»', () => {
    const onResubmit = vi.fn()
    render(<RejectionNotice reason="spam" editHref="/edit" onResubmit={onResubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Отправить повторно' }))
    expect(onResubmit).toHaveBeenCalledOnce()
  })

  it('блокирует кнопку при resubmitDisabled', () => {
    render(
      <RejectionNotice reason="spam" editHref="/edit" onResubmit={() => {}} resubmitDisabled />
    )
    const btn = screen.getByRole('button', { name: 'Отправить повторно' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd frontend && pnpm test -- src/components/moderation/RejectionNotice.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`frontend/src/components/moderation/RejectionNotice.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getRejectionReasonLabel } from '@/lib/moderation-utils'

interface Props {
  reason?: string | null
  comment?: string | null
  editHref: string
  onResubmit: () => void
  resubmitDisabled?: boolean
}

export function RejectionNotice({
  reason,
  comment,
  editHref,
  onResubmit,
  resubmitDisabled,
}: Props) {
  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium text-red-800">
        Отклонено модератором: {getRejectionReasonLabel(reason)}
      </p>
      {comment && <p className="mt-1 text-sm text-red-700">Комментарий модератора: {comment}</p>}
      <p className="mt-1 text-xs text-red-600">
        Исправьте замечания и отправьте публикацию на повторную модерацию.
      </p>
      <div className="mt-2 flex gap-2">
        <Link
          href={editHref}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Исправить
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={onResubmit}
          disabled={resubmitDisabled ?? false}
        >
          Отправить повторно
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `cd frontend && pnpm test -- src/components/moderation/RejectionNotice.test.tsx`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/moderation/RejectionNotice.tsx frontend/src/components/moderation/RejectionNotice.test.tsx
git commit -m "feat(moderation): RejectionNotice component"
```

---

### Task 6: Интеграция RejectionNotice в 3 дашборда + toast при отправке

В каждом дашборде: показать `RejectionNotice` для rejected-элементов; сделать обработчики отправки async с toast об успехе/ошибке. Кнопка «На модарацию» для rejected-элементов уже есть — `RejectionNotice` даёт контекст и дублирует действие (это ок: кнопка в notice — основной CTA для rejected).

**Files:**

- Modify: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx`
- Modify: `frontend/src/app/dashboard/resumes/MyResumesClient.tsx`
- Modify: `frontend/src/app/dashboard/companies/MyCompaniesClient.tsx`

- [ ] **Step 1: MyVacanciesClient**

Добавить импорты:

```tsx
import { toast } from 'sonner'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'
```

Заменить `handlePublish`:

```tsx
const handlePublish = async (id: string) => {
  await store.publishVacancy(id)
  if (!store.error && !store.limitReached) {
    toast.success('Вакансия отправлена на модерацию')
  }
}
```

(вызовы `onClick={() => handlePublish(v.documentId)}` заменить на `onClick={() => void handlePublish(v.documentId)}`).

Внутри `store.myVacancies.map((v) => (...))` после блока `<div className="mt-2 flex gap-4 text-xs text-gray-400">...</div>` (счётчики просмотров, строка ~158) добавить:

```tsx
{
  v.status === 'rejected' && (
    <RejectionNotice
      reason={v.rejectionReason}
      comment={v.rejectionComment}
      editHref={`/dashboard/vacancies/${v.documentId}/edit`}
      onResubmit={() => void handlePublish(v.documentId)}
      resubmitDisabled={store.isLoading}
    />
  )
}
```

- [ ] **Step 2: MyResumesClient**

Аналогично: импорты `toast` + `RejectionNotice`; `handlePublish`:

```tsx
const handlePublish = async (id: string) => {
  await store.publishResume(id)
  if (!store.error) {
    toast.success('Резюме отправлено на модерацию')
  }
}
```

После блока счётчиков внутри `map((r) => ...)` (строка ~133) добавить:

```tsx
{
  r.status === 'rejected' && (
    <RejectionNotice
      reason={r.rejectionReason}
      comment={r.rejectionComment}
      editHref={`/dashboard/resumes/${r.documentId}/edit`}
      onResubmit={() => void handlePublish(r.documentId)}
      resubmitDisabled={store.isLoading}
    />
  )
}
```

- [ ] **Step 3: MyCompaniesClient**

Импорты `toast` + `RejectionNotice`; `handleSubmit`:

```tsx
const handleSubmit = async (id: string) => {
  await store.submitCompany(id)
  if (!store.error) {
    toast.success('Компания отправлена на модерацию')
  }
}
```

Карточка компании — flex-row (`flex items-center gap-4`), notice нужен на всю ширину. Обернуть содержимое карточки: заменить

```tsx
<div
  key={company.documentId}
  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
>
  {/* ...логотип, инфо, кнопки... */}
</div>
```

на

```tsx
<div key={company.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
  <div className="flex items-center gap-4">{/* ...логотип, инфо, кнопки — без изменений... */}</div>
  {company.status === 'rejected' && (
    <RejectionNotice
      reason={company.rejectionReason}
      comment={company.rejectionComment}
      editHref={`/dashboard/companies/${company.documentId}/edit`}
      onResubmit={() => void handleSubmit(company.documentId)}
      resubmitDisabled={store.isLoading}
    />
  )}
</div>
```

- [ ] **Step 4: Проверка**

Run: `cd frontend && pnpm typecheck && pnpm test`
Expected: 0 ошибок TypeScript, существующие тесты дашбордов (`MyVacanciesClient.test.tsx`, `MyCompaniesClient.test.tsx`) зелёные. Если тесты дашбордов падают на `toast` — добавить в начало упавшего тест-файла:

```ts
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx frontend/src/app/dashboard/resumes/MyResumesClient.tsx frontend/src/app/dashboard/companies/MyCompaniesClient.tsx
git commit -m "feat(moderation): rejection notice + resubmit toasts in dashboards"
```

---

### Task 7: ModerationToastWatcher — polling уведомлений

Компонент без UI: раз в 60 секунд опрашивает непрочитанные уведомления; для новых `moderation_approved`/`moderation_rejected` показывает toast. Первый опрос только запоминает существующие (не спамим старыми при загрузке).

**Files:**

- Create: `frontend/src/components/moderation/ModerationToastWatcher.tsx`
- Test: `frontend/src/components/moderation/ModerationToastWatcher.test.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Написать падающий тест**

`frontend/src/components/moderation/ModerationToastWatcher.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const apiGet = vi.fn()
vi.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => apiGet(...args) },
}))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ auth: { isAuthenticated: true } }),
}))

import { ModerationToastWatcher } from './ModerationToastWatcher'

function notif(documentId: string, type: string) {
  return {
    documentId,
    type,
    title: `t-${documentId}`,
    body: `b-${documentId}`,
    isRead: false,
    createdAt: '2026-07-02T00:00:00.000Z',
  }
}

describe('ModerationToastWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toastSuccess.mockClear()
    toastError.mockClear()
    apiGet.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('не показывает toast для уведомлений из первого опроса', async () => {
    apiGet.mockResolvedValue({ data: [notif('n1', 'moderation_rejected')] })
    render(<ModerationToastWatcher />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('показывает toast для нового moderation-уведомления в последующих опросах', async () => {
    apiGet.mockResolvedValueOnce({ data: [] })
    render(<ModerationToastWatcher />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    apiGet.mockResolvedValueOnce({ data: [notif('n2', 'moderation_approved')] })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(toastSuccess).toHaveBeenCalledWith('t-n2', { description: 'b-n2' })
  })

  it('не дублирует toast для уже показанного уведомления', async () => {
    apiGet.mockResolvedValueOnce({ data: [] })
    apiGet.mockResolvedValue({ data: [notif('n3', 'moderation_rejected')] })
    render(<ModerationToastWatcher />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(toastError).toHaveBeenCalledTimes(1)
  })

  it('игнорирует уведомления других типов', async () => {
    apiGet.mockResolvedValueOnce({ data: [] })
    apiGet.mockResolvedValueOnce({ data: [notif('n4', 'new_application')] })
    render(<ModerationToastWatcher />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd frontend && pnpm test -- src/components/moderation/ModerationToastWatcher.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`frontend/src/components/moderation/ModerationToastWatcher.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { useStores } from '@/stores/StoreProvider'
import type { Notification } from '@/types/api'

const POLL_INTERVAL_MS = 60_000

export const ModerationToastWatcher = observer(function ModerationToastWatcher() {
  const { auth } = useStores()
  const seenRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!auth.isAuthenticated) return

    let cancelled = false

    const poll = async () => {
      try {
        const res = await api.get<{ data: Notification[] }>(
          '/notifications?isRead=false&pageSize=20'
        )
        if (cancelled) return
        for (const n of res.data) {
          if (n.type !== 'moderation_approved' && n.type !== 'moderation_rejected') continue
          if (seenRef.current.has(n.documentId)) continue
          seenRef.current.add(n.documentId)
          if (!initializedRef.current) continue
          if (n.type === 'moderation_approved') {
            toast.success(n.title, { description: n.body })
          } else {
            toast.error(n.title, { description: n.body })
          }
        }
        initializedRef.current = true
      } catch {
        // polling failure is non-critical — silently ignore
      }
    }

    void poll()
    const intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [auth.isAuthenticated])

  return null
})
```

- [ ] **Step 4: Тесты зелёные**

Run: `cd frontend && pnpm test -- src/components/moderation/ModerationToastWatcher.test.tsx`
Expected: PASS (4 теста).

- [ ] **Step 5: Смонтировать в AppShell**

В `frontend/src/components/layout/AppShell.tsx` добавить импорт и компонент рядом с `<Toaster />`:

```tsx
import { ModerationToastWatcher } from '@/components/moderation/ModerationToastWatcher'
```

```tsx
      {isMiniApp && <MiniAppBottomNav />}
      <ModerationToastWatcher />
      <Toaster position="top-center" richColors closeButton />
```

- [ ] **Step 6: Проверка и commit**

Run: `cd frontend && pnpm typecheck && pnpm test`
Expected: 0 ошибок, все тесты зелёные.

```bash
git add frontend/src/components/moderation/ModerationToastWatcher.tsx frontend/src/components/moderation/ModerationToastWatcher.test.tsx frontend/src/components/layout/AppShell.tsx
git commit -m "feat(moderation): toast notifications on moderation status change"
```

---

### Task 8: Страница «Мои публикации» (/dashboard/publications)

Сводная страница: все публикации пользователя (вакансии + резюме + компании) со статусами модерации, объяснением и действиями. Использует существующие сторы (первая страница каждого типа; ссылки «Все →» ведут на полные дашборды).

**Files:**

- Create: `frontend/src/app/dashboard/publications/page.tsx`
- Create: `frontend/src/app/dashboard/publications/PublicationsClient.tsx`
- Test: `frontend/src/app/dashboard/publications/PublicationsClient.test.tsx`

- [ ] **Step 1: Написать падающий тест**

`frontend/src/app/dashboard/publications/PublicationsClient.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const vacancyStore = {
  myVacancies: [] as unknown[],
  isLoading: false,
  error: null as string | null,
  limitReached: false,
  fetchMyVacancies: vi.fn(),
  publishVacancy: vi.fn(),
  clearLimitReached: vi.fn(),
}
const resumeStore = {
  myResumes: [] as unknown[],
  isLoading: false,
  error: null as string | null,
  fetchMyResumes: vi.fn(),
  publishResume: vi.fn(),
}
const companyStore = {
  myCompanies: [] as unknown[],
  isLoading: false,
  error: null as string | null,
  fetchMyCompanies: vi.fn(),
  submitCompany: vi.fn(),
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({ vacancy: vacancyStore, resume: resumeStore, company: companyStore }),
}))

import { PublicationsClient } from './PublicationsClient'

describe('PublicationsClient', () => {
  beforeEach(() => {
    vacancyStore.myVacancies = []
    resumeStore.myResumes = []
    companyStore.myCompanies = []
    vacancyStore.fetchMyVacancies.mockClear()
    resumeStore.fetchMyResumes.mockClear()
    companyStore.fetchMyCompanies.mockClear()
  })

  it('загружает все три типа публикаций при монтировании', () => {
    render(<PublicationsClient />)
    expect(vacancyStore.fetchMyVacancies).toHaveBeenCalledOnce()
    expect(resumeStore.fetchMyResumes).toHaveBeenCalledOnce()
    expect(companyStore.fetchMyCompanies).toHaveBeenCalledOnce()
  })

  it('показывает пустое состояние, когда публикаций нет', () => {
    render(<PublicationsClient />)
    expect(screen.getByText(/У вас пока нет публикаций/)).toBeDefined()
  })

  it('отображает вакансию со статусом и названием', () => {
    vacancyStore.myVacancies = [
      { documentId: 'v1', title: 'Frontend Developer', status: 'moderation' },
    ]
    render(<PublicationsClient />)
    expect(screen.getByText('Frontend Developer')).toBeDefined()
    expect(screen.getByText('На модерации')).toBeDefined()
    expect(screen.getByText(/Ожидает проверки модератором/)).toBeDefined()
  })

  it('отображает причину отклонения для rejected-резюме', () => {
    resumeStore.myResumes = [
      {
        documentId: 'r1',
        title: 'QA Engineer',
        status: 'rejected',
        rejectionReason: 'incomplete',
        rejectionComment: 'Добавьте опыт работы',
      },
    ]
    render(<PublicationsClient />)
    expect(screen.getByText(/Недостаточно информации/)).toBeDefined()
    expect(screen.getByText(/Добавьте опыт работы/)).toBeDefined()
  })

  it('отображает компанию с бейджем статуса', () => {
    companyStore.myCompanies = [{ documentId: 'c1', name: 'Acme Inc', status: 'published' }]
    render(<PublicationsClient />)
    expect(screen.getByText('Acme Inc')).toBeDefined()
    expect(screen.getByText('Опубликована')).toBeDefined()
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd frontend && pnpm test -- src/app/dashboard/publications/PublicationsClient.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация PublicationsClient**

`frontend/src/app/dashboard/publications/PublicationsClient.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { StatusBadge } from '@/components/company/StatusBadge'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'

const STATUS_HINTS: Record<string, string> = {
  draft: 'Черновик — заполните и отправьте на модерацию.',
  moderation: 'Ожидает проверки модератором. Обычно это занимает до 24 часов.',
  published: 'Опубликовано и видно всем пользователям.',
  expired: 'Срок публикации истёк. Отправьте повторно, чтобы вернуть в поиск.',
  archived: 'В архиве — не отображается в поиске.',
}

export const PublicationsClient = observer(function PublicationsClient() {
  const { vacancy, resume, company } = useStores()

  useEffect(() => {
    void vacancy.fetchMyVacancies()
    void resume.fetchMyResumes()
    void company.fetchMyCompanies(1)
  }, [vacancy, resume, company])

  const isLoading = vacancy.isLoading || resume.isLoading || company.isLoading
  const isEmpty =
    !isLoading &&
    vacancy.myVacancies.length === 0 &&
    resume.myResumes.length === 0 &&
    company.myCompanies.length === 0

  const resubmitVacancy = async (id: string) => {
    await vacancy.publishVacancy(id)
    if (!vacancy.error && !vacancy.limitReached) {
      toast.success('Вакансия отправлена на модерацию')
    }
  }

  const resubmitResume = async (id: string) => {
    await resume.publishResume(id)
    if (!resume.error) {
      toast.success('Резюме отправлено на модерацию')
    }
  }

  const resubmitCompany = async (id: string) => {
    await company.submitCompany(id)
    if (!company.error) {
      toast.success('Компания отправлена на модерацию')
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Мои публикации</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {isEmpty && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">У вас пока нет публикаций.</p>
        </div>
      )}

      {vacancy.myVacancies.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Вакансии</h2>
            <Link href="/dashboard/vacancies" className="text-sm text-indigo-600 hover:underline">
              Все →
            </Link>
          </div>
          {vacancy.myVacancies.map((v) => (
            <div key={v.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-gray-900">{v.title}</p>
                <VacancyStatusBadge status={v.status} />
              </div>
              {v.status !== 'rejected' && STATUS_HINTS[v.status] && (
                <p className="mt-1 text-sm text-gray-500">{STATUS_HINTS[v.status]}</p>
              )}
              {v.status === 'rejected' && (
                <RejectionNotice
                  reason={v.rejectionReason}
                  comment={v.rejectionComment}
                  editHref={`/dashboard/vacancies/${v.documentId}/edit`}
                  onResubmit={() => void resubmitVacancy(v.documentId)}
                  resubmitDisabled={vacancy.isLoading}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {resume.myResumes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Резюме</h2>
            <Link href="/dashboard/resumes" className="text-sm text-indigo-600 hover:underline">
              Все →
            </Link>
          </div>
          {resume.myResumes.map((r) => (
            <div key={r.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-gray-900">{r.title}</p>
                <ResumeStatusBadge status={r.status} />
              </div>
              {r.status !== 'rejected' && STATUS_HINTS[r.status] && (
                <p className="mt-1 text-sm text-gray-500">{STATUS_HINTS[r.status]}</p>
              )}
              {r.status === 'rejected' && (
                <RejectionNotice
                  reason={r.rejectionReason}
                  comment={r.rejectionComment}
                  editHref={`/dashboard/resumes/${r.documentId}/edit`}
                  onResubmit={() => void resubmitResume(r.documentId)}
                  resubmitDisabled={resume.isLoading}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {company.myCompanies.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Компании</h2>
            <Link href="/dashboard/companies" className="text-sm text-indigo-600 hover:underline">
              Все →
            </Link>
          </div>
          {company.myCompanies.map((c) => (
            <div key={c.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-gray-900">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              {c.status !== 'rejected' && STATUS_HINTS[c.status] && (
                <p className="mt-1 text-sm text-gray-500">{STATUS_HINTS[c.status]}</p>
              )}
              {c.status === 'rejected' && (
                <RejectionNotice
                  reason={c.rejectionReason}
                  comment={c.rejectionComment}
                  editHref={`/dashboard/companies/${c.documentId}/edit`}
                  onResubmit={() => void resubmitCompany(c.documentId)}
                  resubmitDisabled={company.isLoading}
                />
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
})
```

Примечание: `StatusBadge` компании имеет статусы без `expired`/`archived` — `STATUS_HINTS[c.status]` вернёт `undefined` для отсутствующих ключей, блок не отрендерится (проверка `&&`). При `noUncheckedIndexedAccess` доступ `STATUS_HINTS[v.status]` уже типизирован как `string | undefined` — условие корректно.

- [ ] **Step 4: Реализация page.tsx**

`frontend/src/app/dashboard/publications/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { PublicationsClient } from './PublicationsClient'

export const metadata: Metadata = {
  title: 'Мои публикации — GramJob',
}

export default function PublicationsPage() {
  return <PublicationsClient />
}
```

- [ ] **Step 5: Тесты зелёные**

Run: `cd frontend && pnpm test -- src/app/dashboard/publications/PublicationsClient.test.tsx`
Expected: PASS (5 тестов).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/dashboard/publications/
git commit -m "feat(moderation): my publications page with moderation statuses"
```

---

### Task 9: Навигация — ссылка «Мои публикации» в WebHeader

**Files:**

- Modify: `frontend/src/components/layout/WebHeader.tsx`
- Modify: `frontend/src/locales/ru/common.json`
- Modify: `frontend/src/locales/en/common.json`

- [ ] **Step 1: Ключи локализации**

В `frontend/src/locales/ru/common.json` в объект `nav` добавить:

```json
    "publications": "Мои публикации",
```

В `frontend/src/locales/en/common.json` в объект `nav` добавить:

```json
    "publications": "My postings",
```

- [ ] **Step 2: Ссылка в WebHeader**

В `frontend/src/components/layout/WebHeader.tsx` внутри блока `auth.isAuthenticated && auth.user` перед ссылкой на `/dashboard` добавить:

```tsx
<Link
  href="/dashboard/publications"
  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
>
  {t('nav.publications')}
</Link>
```

- [ ] **Step 3: Проверка и commit**

Run: `cd frontend && pnpm typecheck && pnpm test`
Expected: 0 ошибок.

```bash
git add frontend/src/components/layout/WebHeader.tsx frontend/src/locales/ru/common.json frontend/src/locales/en/common.json
git commit -m "feat(moderation): publications link in header navigation"
```

---

### Task 10: Финальная проверка + документация

**Files:**

- Modify: `docs/sprint-plan.md` (секция Sprint 8 → Frontend, строки ~294-299)
- Modify: `CLAUDE.md` (добавить секцию «Выполнено (Sprint 8 Frontend — Moderation)» и обновить «Текущий шаг»)

- [ ] **Step 1: Полный прогон**

Run: `cd frontend && pnpm typecheck && pnpm test && cd ../backend && pnpm typecheck && pnpm test`
Expected: 0 ошибок TypeScript в обоих пакетах, все тесты зелёные.

- [ ] **Step 2: Ручная проверка в браузере (обязательно для UI)**

1. `docker compose up -d`, `cd backend && pnpm develop`, `cd frontend && pnpm dev`.
2. Создать вакансию → отправить на модерацию → в Strapi Admin отклонить с причиной (например, `incomplete` + комментарий).
3. Проверить: на `/dashboard/vacancies` и `/dashboard/publications` виден `RejectionNotice` с причиной и комментарием.
4. Не обновляя страницу, подождать ≤ 60 секунд → появляется красный toast «отклонено».
5. Нажать «Исправить» → форма редактирования; сохранить; «Отправить повторно» → toast «Вакансия отправлена на модерацию», статус «На модерации».
6. В Admin одобрить → в течение 60 сек зелёный toast «одобрено».
7. Повторить пп. 2-3 для резюме и компании (достаточно проверить отображение причины + resubmit).

- [ ] **Step 3: Обновить sprint-plan.md**

В `docs/sprint-plan.md` отметить 4 чекбокса секции «Sprint 8 → Frontend» как `[x]`.

- [ ] **Step 4: Обновить CLAUDE.md**

Добавить секцию «Выполнено (Sprint 8 Frontend — Moderation)» со списком созданных файлов (по образцу предыдущих спринтов), обновить строку «Текущий шаг» на следующий этап (Sprint 9 — Telegram Mini App) и актуальное число тестов.

- [ ] **Step 5: Commit**

```bash
git add docs/sprint-plan.md CLAUDE.md
git commit -m "docs: mark Sprint 8 Frontend (Moderation) as completed"
```

---

## Self-Review

**Spec coverage (4 пункта sprint-плана):**

1. «Индикатор статуса модерации на карточках (pending / rejected + причина)» → бейджи уже были; причина — Tasks 1-3, 5, 6.
2. «Страница „Мои публикации" — статус с объяснением что делать при отклонении» → Task 8 (+ Task 9 навигация).
3. «Кнопка „Исправить и отправить повторно"» → Task 5 (компонент), Tasks 6, 8 (интеграция); backend-переходы rejected → moderation уже существуют.
4. «Уведомление в UI (toast) о смене статуса модерации» → Tasks 4, 7.

**Type consistency:** `ModerationRejectionReason` (Task 2) используется в `moderation-utils` (Task 3); `RejectionNotice` принимает `reason?: string | null` — совместимо с полями `rejectionReason?: ModerationRejectionReason | null`; `getRejectionReasonLabel(reason?: string | null)` совпадает по сигнатуре в тестах и реализации.
