# Sprint 8 Backend — Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Модераторы обрабатывают очередь модерации (вакансии/резюме/компании) и жалобы прямо в Strapi Admin: кнопки «Одобрить»/«Отклонить» с причиной, audit log «кто/когда/что», страница статистики.

**Architecture:** Admin-эндпоинты регистрируются через `strapi.server.routes({ type: 'admin', prefix: '/moderation', ... })` в `src/index.ts` (роуты в `src/api/*` Strapi принудительно делает `content-api` — проверено в `@strapi/core/dist/services/server/register-routes.js`). Авторизация — policy `admin::isAuthenticatedAdmin`, модератор берётся из `ctx.state.user`. UI-кнопки — Document Actions API контент-менеджера (`app.getPlugin('content-manager').apis.addDocumentAction`, API подтверждён в typings @strapi/content-manager 5.48.1). Side-эффекты (expiresAt, уведомления) остаются в lifecycle hooks — они срабатывают и при ручной смене статуса через стандартный UI. Audit log — новый content type ModerationLog.

**Tech Stack:** Strapi 5.48.1, @strapi/design-system, @strapi/icons, jest (unit-тесты в `backend/tests/unit`), PostgreSQL.

**Ключевые факты, проверенные в кодовой базе:**

- `expiresAt = now + 60 days` при переходе в `published` **уже реализовано** в `backend/src/api/vacancy/content-types/vacancy/lifecycles.ts:49-53` (Sprint 3) — отдельная задача не нужна.
- Возврат кредита при отклонении вакансии происходит **автоматически**: `credit-service.ts:75` считает в месячный лимит только статусы `moderation`/`published`; `rejected` не считается.
- Уведомления `moderation_approved` для company/resume уже шлются из lifecycles (Sprint 7); для vacancy стоит `TODO Sprint 8` (`vacancy/lifecycles.ts:69`), `moderation_rejected` не шлётся нигде — добавляем.
- Шаблоны Telegram `moderation_approved`/`moderation_rejected` уже есть в `telegram-bot.ts:191-192`; `moderation_rejected` подставляет `data['reason']`.
- Тип enum `Report.status` сейчас `["pending","reviewed","resolved"]` — меняем на `["pending","resolved","dismissed"]` (данных в проде нет, колонка varchar, миграция не нужна).

**Запуск команд:** все команды ниже выполняются из `backend/` если не указано иное. Тесты: `pnpm test -- <файл>`. Для `strapi ts:generate-types` и smoke-теста нужна поднятая БД: `docker compose up -d` из корня репо.

---

### Task 1: Content type ModerationLog

**Files:**

- Create: `backend/src/api/moderation-log/content-types/moderation-log/schema.json`

Только content type (для audit log и просмотра истории в Admin). Контроллеры/роуты не нужны — записи создаёт сервис, читает модератор через стандартный Content Manager.

- [ ] **Step 1: Создать schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "moderation_logs",
  "info": {
    "singularName": "moderation-log",
    "pluralName": "moderation-logs",
    "displayName": "ModerationLog",
    "description": "Audit log of moderation decisions (who, when, what)"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "entityType": {
      "type": "enumeration",
      "enum": ["vacancy", "resume", "company", "report"],
      "required": true
    },
    "entityDocumentId": {
      "type": "string",
      "required": true
    },
    "entityTitle": {
      "type": "string"
    },
    "action": {
      "type": "enumeration",
      "enum": ["submitted", "approved", "rejected", "report_resolved", "report_dismissed"],
      "required": true
    },
    "reason": {
      "type": "enumeration",
      "enum": [
        "spam",
        "fake",
        "inappropriate",
        "incomplete",
        "wrong_category",
        "salary_mismatch",
        "contact_info",
        "other"
      ]
    },
    "comment": {
      "type": "text"
    },
    "moderatorId": {
      "type": "integer"
    },
    "moderatorName": {
      "type": "string"
    }
  }
}
```

Примечание: `moderatorId`/`moderatorName` — денормализованные поля (relation на `admin::user` из api-схем не поддерживается штатно). `createdAt` Strapi добавляет сам.

- [ ] **Step 2: Commit**

```bash
git add backend/src/api/moderation-log
git commit -m "feat(moderation): add ModerationLog content type for audit trail"
```

---

### Task 2: Поля rejectionReason/rejectionComment + статусы Report

**Files:**

- Modify: `backend/src/api/vacancy/content-types/vacancy/schema.json`
- Modify: `backend/src/api/resume/content-types/resume/schema.json`
- Modify: `backend/src/api/company/content-types/company/schema.json`
- Modify: `backend/src/api/report/content-types/report/schema.json`

- [ ] **Step 1: Добавить в attributes каждой из трёх схем (vacancy, resume, company) два поля**

В конец блока `"attributes"` каждой схемы (не забыть запятую после последнего существующего атрибута):

```json
    "rejectionReason": {
      "type": "enumeration",
      "enum": [
        "spam",
        "fake",
        "inappropriate",
        "incomplete",
        "wrong_category",
        "salary_mismatch",
        "contact_info",
        "other"
      ]
    },
    "rejectionComment": {
      "type": "text"
    }
```

- [ ] **Step 2: В report/schema.json заменить enum статусов**

Было:

```json
    "status": {
      "type": "enumeration",
      "enum": ["pending", "reviewed", "resolved"],
      "default": "pending",
      "required": true
    }
```

Стало:

```json
    "status": {
      "type": "enumeration",
      "enum": ["pending", "resolved", "dismissed"],
      "default": "pending",
      "required": true
    }
```

- [ ] **Step 3: Проверить, что JSON валиден**

Run: `node -e "['vacancy/content-types/vacancy','resume/content-types/resume','company/content-types/company','report/content-types/report'].forEach(p=>JSON.parse(require('fs').readFileSync('src/api/'+p+'/schema.json','utf8')))&&console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/vacancy backend/src/api/resume backend/src/api/company backend/src/api/report
git commit -m "feat(moderation): add rejection fields to vacancy/resume/company, rework report statuses"
```

---

### Task 3: moderation-utils — чистые функции (TDD)

**Files:**

- Create: `backend/src/services/moderation-utils.ts`
- Test: `backend/tests/unit/moderation-utils.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`backend/tests/unit/moderation-utils.test.ts`:

```ts
import {
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  rejectionReasonLabel,
  isModeratableEntity,
  validateRejection,
  computeAvgProcessingHours,
} from '../../src/services/moderation-utils'

describe('REJECTION_REASONS', () => {
  it('содержит 8 причин из moderation-system.md', () => {
    expect(REJECTION_REASONS).toEqual([
      'spam',
      'fake',
      'inappropriate',
      'incomplete',
      'wrong_category',
      'salary_mismatch',
      'contact_info',
      'other',
    ])
  })

  it('у каждой причины есть русская метка', () => {
    for (const r of REJECTION_REASONS) {
      expect(typeof REJECTION_REASON_LABELS[r]).toBe('string')
      expect(REJECTION_REASON_LABELS[r].length).toBeGreaterThan(0)
    }
  })
})

describe('rejectionReasonLabel', () => {
  it('известная причина → метка', () => {
    expect(rejectionReasonLabel('spam')).toBe('Спам или дублирующийся контент')
  })

  it('null/undefined/неизвестная → "см. детали"', () => {
    expect(rejectionReasonLabel(null)).toBe('см. детали')
    expect(rejectionReasonLabel(undefined)).toBe('см. детали')
    expect(rejectionReasonLabel('nope')).toBe('см. детали')
  })
})

describe('isModeratableEntity', () => {
  it('vacancy/resume/company → true', () => {
    expect(isModeratableEntity('vacancy')).toBe(true)
    expect(isModeratableEntity('resume')).toBe(true)
    expect(isModeratableEntity('company')).toBe(true)
  })

  it('report/user/пустая строка → false', () => {
    expect(isModeratableEntity('report')).toBe(false)
    expect(isModeratableEntity('user')).toBe(false)
    expect(isModeratableEntity('')).toBe(false)
  })
})

describe('validateRejection', () => {
  it('валидная причина без комментария → null', () => {
    expect(validateRejection('spam', undefined)).toBeNull()
  })

  it('неизвестная причина → INVALID_REASON', () => {
    expect(validateRejection('bad_reason', undefined)).toBe('INVALID_REASON')
  })

  it('не-строка → INVALID_REASON', () => {
    expect(validateRejection(5, undefined)).toBe('INVALID_REASON')
    expect(validateRejection(undefined, undefined)).toBe('INVALID_REASON')
  })

  it('other без комментария → COMMENT_REQUIRED', () => {
    expect(validateRejection('other', undefined)).toBe('COMMENT_REQUIRED')
    expect(validateRejection('other', '   ')).toBe('COMMENT_REQUIRED')
  })

  it('other с комментарием → null', () => {
    expect(validateRejection('other', 'дубликат вакансии #42')).toBeNull()
  })
})

describe('computeAvgProcessingHours', () => {
  const log = (
    entityType: string,
    entityDocumentId: string,
    action: string,
    createdAt: string
  ) => ({ entityType, entityDocumentId, action, createdAt })

  it('нет пар submitted→решение → null', () => {
    expect(computeAvgProcessingHours([])).toBeNull()
    expect(
      computeAvgProcessingHours([log('vacancy', 'a', 'approved', '2026-07-01T12:00:00Z')])
    ).toBeNull()
  })

  it('среднее по парам: 2ч и 4ч → 3', () => {
    const logs = [
      log('vacancy', 'a', 'submitted', '2026-07-01T10:00:00Z'),
      log('vacancy', 'a', 'approved', '2026-07-01T12:00:00Z'),
      log('resume', 'b', 'submitted', '2026-07-01T10:00:00Z'),
      log('resume', 'b', 'rejected', '2026-07-01T14:00:00Z'),
    ]
    expect(computeAvgProcessingHours(logs)).toBe(3)
  })

  it('порядок входных логов не важен (сортирует сам)', () => {
    const logs = [
      log('vacancy', 'a', 'approved', '2026-07-01T12:00:00Z'),
      log('vacancy', 'a', 'submitted', '2026-07-01T10:00:00Z'),
    ]
    expect(computeAvgProcessingHours(logs)).toBe(2)
  })

  it('повторная подача: пара считается от последнего submitted', () => {
    const logs = [
      log('vacancy', 'a', 'submitted', '2026-07-01T00:00:00Z'),
      log('vacancy', 'a', 'rejected', '2026-07-01T01:00:00Z'),
      log('vacancy', 'a', 'submitted', '2026-07-02T00:00:00Z'),
      log('vacancy', 'a', 'approved', '2026-07-02T02:00:00Z'),
    ]
    // пары: 1ч и 2ч → 1.5
    expect(computeAvgProcessingHours(logs)).toBe(1.5)
  })

  it('решение без submitted игнорируется, округление до 1 знака', () => {
    const logs = [
      log('vacancy', 'x', 'approved', '2026-07-01T05:00:00Z'),
      log('company', 'c', 'submitted', '2026-07-01T00:00:00Z'),
      log('company', 'c', 'approved', '2026-07-01T00:20:00Z'),
    ]
    expect(computeAvgProcessingHours(logs)).toBe(0.3)
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `pnpm test -- moderation-utils`
Expected: FAIL — `Cannot find module '../../src/services/moderation-utils'`

- [ ] **Step 3: Реализовать moderation-utils.ts**

`backend/src/services/moderation-utils.ts`:

```ts
export const REJECTION_REASONS = [
  'spam',
  'fake',
  'inappropriate',
  'incomplete',
  'wrong_category',
  'salary_mismatch',
  'contact_info',
  'other',
] as const

export type RejectionReason = (typeof REJECTION_REASONS)[number]

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  spam: 'Спам или дублирующийся контент',
  fake: 'Фиктивная вакансия/компания',
  inappropriate: 'Неприемлемый контент',
  incomplete: 'Недостаточно информации',
  wrong_category: 'Неправильная категория',
  salary_mismatch: 'Некорректные данные о зарплате',
  contact_info: 'Контактные данные в запрещённых полях',
  other: 'Другое',
}

export function rejectionReasonLabel(reason?: string | null): string {
  if (reason && (REJECTION_REASONS as readonly string[]).includes(reason)) {
    return REJECTION_REASON_LABELS[reason as RejectionReason]
  }
  return 'см. детали'
}

export const MODERATABLE_ENTITIES = {
  vacancy: 'api::vacancy.vacancy',
  resume: 'api::resume.resume',
  company: 'api::company.company',
} as const

export type ModeratableEntityType = keyof typeof MODERATABLE_ENTITIES

export function isModeratableEntity(value: string): value is ModeratableEntityType {
  return value in MODERATABLE_ENTITIES
}

export function validateRejection(reason: unknown, comment: unknown): string | null {
  if (typeof reason !== 'string' || !(REJECTION_REASONS as readonly string[]).includes(reason)) {
    return 'INVALID_REASON'
  }
  if (reason === 'other' && (typeof comment !== 'string' || comment.trim().length === 0)) {
    return 'COMMENT_REQUIRED'
  }
  return null
}

export interface ModerationLogEntry {
  entityType: string
  entityDocumentId: string
  action: string
  createdAt: string | Date
}

export function computeAvgProcessingHours(logs: ModerationLogEntry[]): number | null {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const lastSubmitted = new Map<string, number>()
  const durations: number[] = []

  for (const entry of sorted) {
    const key = `${entry.entityType}:${entry.entityDocumentId}`
    const ts = new Date(entry.createdAt).getTime()

    if (entry.action === 'submitted') {
      lastSubmitted.set(key, ts)
      continue
    }

    if (entry.action === 'approved' || entry.action === 'rejected') {
      const submittedAt = lastSubmitted.get(key)
      if (submittedAt !== undefined && ts >= submittedAt) {
        durations.push((ts - submittedAt) / 3_600_000)
        lastSubmitted.delete(key)
      }
    }
  }

  if (durations.length === 0) return null
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length
  return Math.round(avg * 10) / 10
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `pnpm test -- moderation-utils`
Expected: PASS (все тесты зелёные)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/moderation-utils.ts backend/tests/unit/moderation-utils.test.ts
git commit -m "feat(moderation): add moderation-utils (reasons, validation, avg processing time)"
```

---

### Task 4: moderation.service — approve/reject/reports/stats/log

**Files:**

- Create: `backend/src/services/moderation.service.ts`

Сервис работает через `strapi.documents` (паттерн `notification.service.ts`). Интеграционная логика — unit-тесты не пишем (чистые части покрыты в Task 3), проверка — smoke-тест в Task 10.

- [ ] **Step 1: Создать moderation.service.ts**

```ts
import type { Core } from '@strapi/strapi'
import {
  MODERATABLE_ENTITIES,
  computeAvgProcessingHours,
  type ModeratableEntityType,
  type RejectionReason,
} from './moderation-utils'

export interface AdminModerator {
  id: number
  firstname?: string | null
  lastname?: string | null
  email?: string | null
}

export type ModerationResult = { ok: true } | { ok: false; code: 'NOT_FOUND' | 'INVALID_STATUS' }

export interface ModerationStats {
  queue: { vacancies: number; resumes: number; companies: number; reports: number }
  avgProcessingHours: number | null
  decidedLast7Days: number
}

const TITLE_FIELDS: Record<ModeratableEntityType, string> = {
  vacancy: 'title',
  resume: 'title',
  company: 'name',
}

function moderatorName(moderator: AdminModerator): string {
  const name = [moderator.firstname, moderator.lastname].filter(Boolean).join(' ')
  return name || moderator.email || `admin#${moderator.id}`
}

interface LogEntry {
  entityType: 'vacancy' | 'resume' | 'company' | 'report'
  entityDocumentId: string
  entityTitle?: string
  action: 'submitted' | 'approved' | 'rejected' | 'report_resolved' | 'report_dismissed'
  reason?: string
  comment?: string
  moderator?: AdminModerator
}

export async function logModeration(strapi: Core.Strapi, entry: LogEntry): Promise<void> {
  try {
    await (strapi.documents as any)('api::moderation-log.moderation-log').create({
      data: {
        entityType: entry.entityType,
        entityDocumentId: entry.entityDocumentId,
        entityTitle: entry.entityTitle ?? null,
        action: entry.action,
        reason: entry.reason ?? null,
        comment: entry.comment ?? null,
        moderatorId: entry.moderator?.id ?? null,
        moderatorName: entry.moderator ? moderatorName(entry.moderator) : null,
      },
    })
  } catch (err) {
    strapi.log.error('[moderation] Failed to write moderation log', err)
  }
}

export async function approveEntity(
  strapi: Core.Strapi,
  entityType: ModeratableEntityType,
  documentId: string,
  moderator: AdminModerator
): Promise<ModerationResult> {
  const uid = MODERATABLE_ENTITIES[entityType]
  const titleField = TITLE_FIELDS[entityType]

  const doc = await (strapi.documents as any)(uid).findOne({
    documentId,
    fields: ['documentId', 'status', titleField],
  })
  if (!doc) return { ok: false, code: 'NOT_FOUND' }
  if (doc.status !== 'moderation') return { ok: false, code: 'INVALID_STATUS' }

  await (strapi.documents as any)(uid).update({
    documentId,
    data: { status: 'published', rejectionReason: null, rejectionComment: null },
  })

  await logModeration(strapi, {
    entityType,
    entityDocumentId: documentId,
    entityTitle: doc[titleField] ?? '',
    action: 'approved',
    moderator,
  })
  return { ok: true }
}

export async function rejectEntity(
  strapi: Core.Strapi,
  entityType: ModeratableEntityType,
  documentId: string,
  reason: RejectionReason,
  comment: string | undefined,
  moderator: AdminModerator
): Promise<ModerationResult> {
  const uid = MODERATABLE_ENTITIES[entityType]
  const titleField = TITLE_FIELDS[entityType]

  const doc = await (strapi.documents as any)(uid).findOne({
    documentId,
    fields: ['documentId', 'status', titleField],
  })
  if (!doc) return { ok: false, code: 'NOT_FOUND' }
  if (doc.status !== 'moderation') return { ok: false, code: 'INVALID_STATUS' }

  await (strapi.documents as any)(uid).update({
    documentId,
    data: { status: 'rejected', rejectionReason: reason, rejectionComment: comment ?? null },
  })

  await logModeration(strapi, {
    entityType,
    entityDocumentId: documentId,
    entityTitle: doc[titleField] ?? '',
    action: 'rejected',
    reason,
    ...(comment ? { comment } : {}),
    moderator,
  })
  return { ok: true }
}

export async function decideReport(
  strapi: Core.Strapi,
  documentId: string,
  decision: 'resolved' | 'dismissed',
  moderator: AdminModerator
): Promise<ModerationResult> {
  const report = await (strapi.documents as any)('api::report.report').findOne({
    documentId,
    fields: ['documentId', 'status', 'type', 'targetId'],
  })
  if (!report) return { ok: false, code: 'NOT_FOUND' }
  if (report.status !== 'pending') return { ok: false, code: 'INVALID_STATUS' }

  await (strapi.documents as any)('api::report.report').update({
    documentId,
    data: { status: decision },
  })

  await logModeration(strapi, {
    entityType: 'report',
    entityDocumentId: documentId,
    entityTitle: `${report.type}#${report.targetId}`,
    action: decision === 'resolved' ? 'report_resolved' : 'report_dismissed',
    moderator,
  })
  return { ok: true }
}

export async function getModerationStats(strapi: Core.Strapi): Promise<ModerationStats> {
  const countInModeration = (uid: string) =>
    (strapi.documents as any)(uid).count({ filters: { status: 'moderation' } })

  const weekAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString()

  const [vacancies, resumes, companies, reports, logs, decidedLast7Days] = await Promise.all([
    countInModeration('api::vacancy.vacancy'),
    countInModeration('api::resume.resume'),
    countInModeration('api::company.company'),
    (strapi.documents as any)('api::report.report').count({
      filters: { status: 'pending' },
    }),
    (strapi.documents as any)('api::moderation-log.moderation-log').findMany({
      filters: { action: { $in: ['submitted', 'approved', 'rejected'] } },
      fields: ['entityType', 'entityDocumentId', 'action', 'createdAt'],
      sort: 'createdAt:desc',
      limit: 500,
    }),
    (strapi.documents as any)('api::moderation-log.moderation-log').count({
      filters: {
        action: { $in: ['approved', 'rejected'] },
        createdAt: { $gte: weekAgo },
      },
    }),
  ])

  return {
    queue: { vacancies, resumes, companies, reports },
    avgProcessingHours: computeAvgProcessingHours(logs),
    decidedLast7Days,
  }
}
```

- [ ] **Step 2: Проверить компиляцию**

Run: `pnpm exec tsc --noEmit -p tsconfig.json`
Expected: 0 ошибок (если в проекте tsc так не запускается — `pnpm build` в Task 10 проверит; допустимо отложить)

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/moderation.service.ts
git commit -m "feat(moderation): add moderation service (approve/reject/reports/stats/audit log)"
```

---

### Task 5: Admin-роуты /moderation/\*

**Files:**

- Create: `backend/src/services/moderation-routes.ts`
- Modify: `backend/src/index.ts` (функция `register`)

Роуты типа `admin` монтируются без префикса `/api` (итоговые URL: `POST /moderation/vacancy/:documentId/approve` и т.д.), аутентификация — admin JWT (strategy `admin` кладёт админа в `ctx.state.user`), авторизация — policy `admin::isAuthenticatedAdmin`.

- [ ] **Step 1: Создать moderation-routes.ts**

```ts
import type { Core } from '@strapi/strapi'
import { isModeratableEntity, validateRejection, type RejectionReason } from './moderation-utils'
import {
  approveEntity,
  rejectEntity,
  decideReport,
  getModerationStats,
  type AdminModerator,
  type ModerationResult,
} from './moderation.service'

const ADMIN_CONFIG = { policies: ['admin::isAuthenticatedAdmin'] }

function sendResult(ctx: any, result: ModerationResult) {
  if (result.ok) {
    ctx.send({ ok: true })
    return
  }
  if (result.code === 'NOT_FOUND') {
    ctx.notFound('Entity not found')
    return
  }
  ctx.send({ ok: false, error: 'INVALID_STATUS' }, 409)
}

export function registerModerationRoutes(strapi: Core.Strapi) {
  strapi.server.routes({
    type: 'admin',
    prefix: '/moderation',
    routes: [
      {
        method: 'POST',
        path: '/:entityType/:documentId/approve',
        handler: async (ctx: any) => {
          const { entityType, documentId } = ctx.params as {
            entityType: string
            documentId: string
          }
          if (!isModeratableEntity(entityType)) {
            return ctx.badRequest('Unknown entity type')
          }
          const result = await approveEntity(
            strapi,
            entityType,
            documentId,
            ctx.state.user as AdminModerator
          )
          return sendResult(ctx, result)
        },
        config: ADMIN_CONFIG,
      },
      {
        method: 'POST',
        path: '/:entityType/:documentId/reject',
        handler: async (ctx: any) => {
          const { entityType, documentId } = ctx.params as {
            entityType: string
            documentId: string
          }
          if (!isModeratableEntity(entityType)) {
            return ctx.badRequest('Unknown entity type')
          }
          const body = (ctx.request.body ?? {}) as { reason?: unknown; comment?: unknown }
          const validationError = validateRejection(body.reason, body.comment)
          if (validationError) {
            return ctx.badRequest(validationError)
          }
          const comment =
            typeof body.comment === 'string' && body.comment.trim().length > 0
              ? body.comment.trim()
              : undefined
          const result = await rejectEntity(
            strapi,
            entityType,
            documentId,
            body.reason as RejectionReason,
            comment,
            ctx.state.user as AdminModerator
          )
          return sendResult(ctx, result)
        },
        config: ADMIN_CONFIG,
      },
      {
        method: 'POST',
        path: '/reports/:documentId/resolve',
        handler: async (ctx: any) => {
          const result = await decideReport(
            strapi,
            (ctx.params as { documentId: string }).documentId,
            'resolved',
            ctx.state.user as AdminModerator
          )
          return sendResult(ctx, result)
        },
        config: ADMIN_CONFIG,
      },
      {
        method: 'POST',
        path: '/reports/:documentId/dismiss',
        handler: async (ctx: any) => {
          const result = await decideReport(
            strapi,
            (ctx.params as { documentId: string }).documentId,
            'dismissed',
            ctx.state.user as AdminModerator
          )
          return sendResult(ctx, result)
        },
        config: ADMIN_CONFIG,
      },
      {
        method: 'GET',
        path: '/stats',
        handler: async (ctx: any) => {
          ctx.send(await getModerationStats(strapi))
        },
        config: ADMIN_CONFIG,
      },
    ],
  })
}
```

- [ ] **Step 2: Подключить в src/index.ts**

Добавить импорт и вызов в `register`:

```ts
import { registerModerationRoutes } from './services/moderation-routes'
```

Заменить:

```ts
  register({ strapi: _strapi }: { strapi: Core.Strapi }) {},
```

на:

```ts
  register({ strapi }: { strapi: Core.Strapi }) {
    registerModerationRoutes(strapi)
  },
```

Примечание: если при старте `strapi.server` окажется недоступен в `register` (ошибка при boot) — перенести вызов первой строкой в `bootstrap` (роуты монтируются позже, при `listen`, так что оба варианта рабочие; `register` предпочтительнее).

- [ ] **Step 3: Smoke-проверка аутентификации (нужны БД и запущенный Strapi)**

```bash
docker compose up -d   # из корня репо, если не поднято
pnpm dev               # дождаться "Strapi started", затем в другом терминале:
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:1337/moderation/vacancy/some-id/approve
```

Expected: `401` (без admin-токена доступ закрыт). `404` означает, что роуты не смонтировались — проверить Step 2.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/moderation-routes.ts backend/src/index.ts
git commit -m "feat(moderation): add admin-only moderation endpoints (approve/reject/reports/stats)"
```

---

### Task 6: buildNotificationData — generic-ветка для moderation\_\* (TDD)

**Files:**

- Modify: `backend/src/services/notification.service.ts:39-68` (функция `buildNotificationData`)
- Test: `backend/tests/unit/notification-service.test.ts`

Сейчас `buildNotificationData` для `moderation_approved`/`moderation_rejected` умеет строить ссылку только на resume. Company lifecycle уже передаёт `entityType`/`entityId`, но они игнорируются. Добавляем generic-ветку.

- [ ] **Step 1: Добавить падающие тесты в notification-service.test.ts**

В конец `describe('buildNotificationData', ...)`:

```ts
it('moderation_approved с entityType=vacancy строит vacancy', () => {
  const d = buildNotificationData('moderation_approved', {
    entityType: 'vacancy',
    entityId: 'v1',
  })
  expect(d?.entityType).toBe('vacancy')
  expect(d?.entityId).toBe('v1')
})

it('moderation_rejected с entityType=company строит company', () => {
  const d = buildNotificationData('moderation_rejected', {
    entityType: 'company',
    entityId: 'c1',
  })
  expect(d?.entityType).toBe('company')
  expect(d?.entityId).toBe('c1')
})

it('moderation_approved с resumeId (без entityType) остаётся resume', () => {
  const d = buildNotificationData('moderation_approved', { resumeId: 'r1' })
  expect(d?.entityType).toBe('resume')
  expect(d?.entityId).toBe('r1')
})
```

- [ ] **Step 2: Убедиться, что новые тесты падают**

Run: `pnpm test -- notification-service`
Expected: FAIL — два новых теста (vacancy/company возвращают `null`), тест с resumeId проходит

- [ ] **Step 3: Добавить generic-ветку в начало buildNotificationData**

Первой проверкой в функции (до ветки с `vacancyId`):

```ts
if (
  ['moderation_approved', 'moderation_rejected'].includes(type) &&
  templateData['entityType'] &&
  templateData['entityId']
) {
  return {
    entityType: templateData['entityType'] as string,
    entityId: templateData['entityId'] as string | number,
  }
}
```

- [ ] **Step 4: Убедиться, что все тесты проходят**

Run: `pnpm test -- notification-service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/notification.service.ts backend/tests/unit/notification-service.test.ts
git commit -m "feat(moderation): link moderation notifications to any entity type"
```

---

### Task 7: Lifecycles — log «submitted», уведомления approved/rejected

**Files:**

- Modify: `backend/src/api/vacancy/content-types/vacancy/lifecycles.ts` (afterUpdate)
- Modify: `backend/src/api/resume/content-types/resume/lifecycles.ts` (afterUpdate)
- Modify: `backend/src/api/company/content-types/company/lifecycles.ts` (afterUpdate)

Логика для всех трёх: при `status=moderation` — записать `submitted` в ModerationLog; при `status=published` — уведомление `moderation_approved` (у vacancy это закрывает `TODO Sprint 8`); при `status=rejected` — уведомление `moderation_rejected` с меткой причины. Записи `approved`/`rejected` в ModerationLog создаёт сервис (Task 4) — в lifecycle их НЕ дублировать (иначе двойные записи при работе через кнопки).

Проверка `event.params.data?.['status']` обязательна — она отсекает обновления счётчиков (views++) на опубликованных сущностях (существующий паттерн).

- [ ] **Step 1: Переписать afterUpdate в vacancy/lifecycles.ts**

Добавить импорты в начало файла:

```ts
import { sendNotification } from '../../../../services/notification.service'
import { logModeration } from '../../../../services/moderation.service'
import { rejectionReasonLabel } from '../../../../services/moderation-utils'
import type { Core } from '@strapi/strapi'
```

Заменить существующий `afterUpdate` (строки 61–71) на:

```ts
  async afterUpdate(event: VacancyAfterEvent) {
    // No await: raw SQL runs after Strapi commits the transaction to avoid lock deadlock
    updateSearchVector(event.result.id)

    const statusSet = event.params.data?.['status']
    if (statusSet !== 'moderation' && statusSet !== 'published' && statusSet !== 'rejected') {
      return
    }

    const s = globalThis.strapi as Core.Strapi
    const documentId = event.result.documentId
    if (!documentId) return

    try {
      const vacancy = await (s.documents as any)('api::vacancy.vacancy').findOne({
        documentId,
        populate: { postedBy: { fields: ['id'] } },
        fields: ['documentId', 'title', 'rejectionReason'],
      })

      if (statusSet === 'moderation') {
        await logModeration(s, {
          entityType: 'vacancy',
          entityDocumentId: documentId,
          entityTitle: vacancy?.title ?? '',
          action: 'submitted',
        })
        return
      }

      if (!vacancy?.postedBy?.id) return

      if (statusSet === 'published') {
        s.log.info(`[vacancy] Vacancy ${documentId} published`)
        await sendNotification(s, {
          userId: vacancy.postedBy.id,
          type: 'moderation_approved',
          templateData: {
            title: vacancy.title ?? '',
            entityType: 'vacancy',
            entityId: documentId,
          },
        })
      } else {
        await sendNotification(s, {
          userId: vacancy.postedBy.id,
          type: 'moderation_rejected',
          templateData: {
            title: vacancy.title ?? '',
            reason: rejectionReasonLabel(vacancy.rejectionReason),
            entityType: 'vacancy',
            entityId: documentId,
          },
        })
      }
    } catch (err) {
      s.log.error('[vacancy] Moderation lifecycle failed', err)
    }
  },
```

- [ ] **Step 2: Переписать afterUpdate в resume/lifecycles.ts**

Добавить импорты:

```ts
import { logModeration } from '../../../../services/moderation.service'
import { rejectionReasonLabel } from '../../../../services/moderation-utils'
```

Заменить весь `afterUpdate` на:

```ts
  async afterUpdate(event: ResumeAfterEvent) {
    const s = globalThis.strapi as Core.Strapi

    // Counter updates (views++) on published resumes must not re-trigger this.
    const statusSet = event.params.data?.['status']
    if (statusSet !== 'moderation' && statusSet !== 'published' && statusSet !== 'rejected') {
      return
    }

    const documentId = event.result.documentId
    if (!documentId) return

    try {
      const resume = await (s.documents as any)('api::resume.resume').findOne({
        documentId,
        populate: { user: { fields: ['id'] } },
        fields: ['documentId', 'title', 'rejectionReason'],
      })

      if (statusSet === 'moderation') {
        await logModeration(s, {
          entityType: 'resume',
          entityDocumentId: documentId,
          entityTitle: resume?.title ?? '',
          action: 'submitted',
        })
        return
      }

      if (!resume?.user?.id) return

      if (statusSet === 'published') {
        s.log.info(`[resume] Resume ${documentId} published`)
        await sendNotification(s, {
          userId: resume.user.id,
          type: 'moderation_approved',
          templateData: {
            title: resume.title ?? '',
            entityType: 'resume',
            entityId: documentId,
            resumeId: documentId,
          },
        })
      } else {
        await sendNotification(s, {
          userId: resume.user.id,
          type: 'moderation_rejected',
          templateData: {
            title: resume.title ?? '',
            reason: rejectionReasonLabel(resume.rejectionReason),
            entityType: 'resume',
            entityId: documentId,
            resumeId: documentId,
          },
        })
      }
    } catch (err) {
      s.log.error('[resume] Moderation lifecycle failed', err)
    }
  },
```

- [ ] **Step 3: Переписать afterUpdate в company/lifecycles.ts**

Добавить импорты:

```ts
import { logModeration } from '../../../../services/moderation.service'
import { rejectionReasonLabel } from '../../../../services/moderation-utils'
```

Заменить весь `afterUpdate` на:

```ts
  async afterUpdate(event: CompanyLifecycleEvent) {
    const statusSet = event.params.data?.['status']
    if (statusSet !== 'moderation' && statusSet !== 'published' && statusSet !== 'rejected') {
      return
    }

    const s = globalThis.strapi as Core.Strapi
    const documentId = event.result.documentId
    if (!documentId) return

    try {
      const company = await (s.documents as any)('api::company.company').findOne({
        documentId,
        populate: { owner: { fields: ['id'] } },
        fields: ['documentId', 'name', 'rejectionReason'],
      })

      if (statusSet === 'moderation') {
        await logModeration(s, {
          entityType: 'company',
          entityDocumentId: documentId,
          entityTitle: company?.name ?? '',
          action: 'submitted',
        })
        return
      }

      if (!company?.owner?.id) return

      if (statusSet === 'published') {
        s.log.info(`[company] Company ${documentId} published`)
        await sendNotification(s, {
          userId: company.owner.id,
          type: 'moderation_approved',
          templateData: {
            title: company.name ?? '',
            entityType: 'company',
            entityId: documentId,
          },
        })
      } else {
        await sendNotification(s, {
          userId: company.owner.id,
          type: 'moderation_rejected',
          templateData: {
            title: company.name ?? '',
            reason: rejectionReasonLabel(company.rejectionReason),
            entityType: 'company',
            entityId: documentId,
          },
        })
      }
    } catch (err) {
      s.log.error('[company] Moderation lifecycle failed', err)
    }
  },
```

- [ ] **Step 4: Прогнать все unit-тесты**

Run: `pnpm test`
Expected: PASS (все существующие + новые тесты зелёные)

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/vacancy/content-types/vacancy/lifecycles.ts backend/src/api/resume/content-types/resume/lifecycles.ts backend/src/api/company/content-types/company/lifecycles.ts
git commit -m "feat(moderation): submission audit log + approved/rejected notifications in lifecycles"
```

---

### Task 8: Admin UI — Document Actions «Одобрить»/«Отклонить»

**Files:**

- Create: `backend/src/admin/app.tsx` (на основе `app.example.tsx`; example-файл не трогать)
- Create: `backend/src/admin/extensions/moderation/actions.tsx`

API подтверждён в typings `@strapi/content-manager` 5.48.1: Document Action — компонент-функция, получает `{ model, documentId, document, ... }`, возвращает description-объект или `null` (тогда кнопка скрыта). `dialog.type: 'dialog'` — confirm-диалог, `dialog.type: 'modal'` — модал с произвольным содержимым (форма отклонения).

- [ ] **Step 1: Создать extensions/moderation/actions.tsx**

```tsx
import * as React from 'react'
import { useState } from 'react'
import {
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  Typography,
} from '@strapi/design-system'
import { getFetchClient } from '@strapi/strapi/admin'

const REJECTION_REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Спам или дублирующийся контент' },
  { value: 'fake', label: 'Фиктивная вакансия/компания' },
  { value: 'inappropriate', label: 'Неприемлемый контент' },
  { value: 'incomplete', label: 'Недостаточно информации' },
  { value: 'wrong_category', label: 'Неправильная категория' },
  { value: 'salary_mismatch', label: 'Некорректные данные о зарплате' },
  { value: 'contact_info', label: 'Контактные данные в запрещённых полях' },
  { value: 'other', label: 'Другое (обязателен комментарий)' },
]

const MODERATED_MODELS: Record<string, string> = {
  'api::vacancy.vacancy': 'vacancy',
  'api::resume.resume': 'resume',
  'api::company.company': 'company',
}

interface ActionProps {
  model: string
  documentId?: string
  document?: { status?: string } & Record<string, unknown>
}

export const ApproveAction = ({ model, documentId, document }: ActionProps) => {
  const entityType = MODERATED_MODELS[model]
  if (!entityType || !documentId || document?.status !== 'moderation') return null

  return {
    label: 'Одобрить',
    variant: 'success' as const,
    position: ['panel' as const],
    dialog: {
      type: 'dialog' as const,
      title: 'Одобрить публикацию?',
      content: 'Статус изменится на published, пользователь получит уведомление.',
      onConfirm: async () => {
        const { post } = getFetchClient()
        await post(`/moderation/${entityType}/${documentId}/approve`)
        window.location.reload()
      },
    },
  }
}

const RejectForm = ({
  entityType,
  documentId,
  onClose,
}: {
  entityType: string
  documentId: string
  onClose: () => void
}) => {
  const [reason, setReason] = useState('spam')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (reason === 'other' && comment.trim() === '') {
      setError('Для причины «Другое» комментарий обязателен')
      return
    }
    setSubmitting(true)
    try {
      const { post } = getFetchClient()
      await post(`/moderation/${entityType}/${documentId}/reject`, {
        reason,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      })
      onClose()
      window.location.reload()
    } catch {
      setError('Не удалось отклонить. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Field.Root>
        <Field.Label>Причина отклонения</Field.Label>
        <SingleSelect value={reason} onChange={(v: string | number) => setReason(String(v))}>
          {REJECTION_REASONS.map((r) => (
            <SingleSelectOption key={r.value} value={r.value}>
              {r.label}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
      <Field.Root>
        <Field.Label>Комментарий (виден пользователю)</Field.Label>
        <Textarea
          value={comment}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
        />
      </Field.Root>
      {error ? <Typography textColor="danger600">{error}</Typography> : null}
      <Flex justifyContent="flex-end" gap={2}>
        <Button variant="tertiary" onClick={onClose} disabled={submitting}>
          Отмена
        </Button>
        <Button variant="danger" onClick={submit} loading={submitting}>
          Отклонить
        </Button>
      </Flex>
    </Flex>
  )
}

export const RejectAction = ({ model, documentId, document }: ActionProps) => {
  const entityType = MODERATED_MODELS[model]
  if (!entityType || !documentId || document?.status !== 'moderation') return null

  return {
    label: 'Отклонить',
    variant: 'danger' as const,
    position: ['panel' as const],
    dialog: {
      type: 'modal' as const,
      title: 'Отклонить публикацию',
      content: ({ onClose }: { onClose: () => void }) => (
        <RejectForm entityType={entityType} documentId={documentId} onClose={onClose} />
      ),
    },
  }
}

const REPORT_MODEL = 'api::report.report'

export const ResolveReportAction = ({ model, documentId, document }: ActionProps) => {
  if (model !== REPORT_MODEL || !documentId || document?.status !== 'pending') return null

  return {
    label: 'Жалоба подтверждена',
    variant: 'success' as const,
    position: ['panel' as const],
    dialog: {
      type: 'dialog' as const,
      title: 'Подтвердить жалобу?',
      content:
        'Статус жалобы станет resolved. Действие над сущностью (отклонение) выполните отдельно на её странице.',
      onConfirm: async () => {
        const { post } = getFetchClient()
        await post(`/moderation/reports/${documentId}/resolve`)
        window.location.reload()
      },
    },
  }
}

export const DismissReportAction = ({ model, documentId, document }: ActionProps) => {
  if (model !== REPORT_MODEL || !documentId || document?.status !== 'pending') return null

  return {
    label: 'Отклонить жалобу',
    variant: 'danger' as const,
    position: ['panel' as const],
    dialog: {
      type: 'dialog' as const,
      title: 'Отклонить жалобу?',
      content: 'Статус жалобы станет dismissed, сущность останется без изменений.',
      onConfirm: async () => {
        const { post } = getFetchClient()
        await post(`/moderation/reports/${documentId}/dismiss`)
        window.location.reload()
      },
    },
  }
}
```

- [ ] **Step 2: Создать src/admin/app.tsx**

```tsx
import type { StrapiApp } from '@strapi/strapi/admin'
import { Check } from '@strapi/icons'
import {
  ApproveAction,
  RejectAction,
  ResolveReportAction,
  DismissReportAction,
} from './extensions/moderation/actions'

export default {
  config: {
    locales: [],
  },
  register(app: StrapiApp) {
    app.addMenuLink({
      to: '/moderation',
      icon: Check,
      intlLabel: { id: 'moderation.menu.label', defaultMessage: 'Модерация' },
      permissions: [],
      Component: () => import('./extensions/moderation/StatsPage'),
    })
  },
  bootstrap(app: StrapiApp) {
    const contentManager = app.getPlugin('content-manager')
    const apis = contentManager.apis as unknown as {
      addDocumentAction: (reducer: (actions: unknown[]) => unknown[]) => void
    }
    apis.addDocumentAction((actions) => [
      ApproveAction,
      RejectAction,
      ResolveReportAction,
      DismissReportAction,
      ...actions,
    ])
  },
}
```

Примечание: `StatsPage` создаётся в Task 9 — до него `pnpm build` упадёт на этом импорте; выполнять Task 8 и 9 подряд, билд-проверка — в Task 9 Step 2.

- [ ] **Step 3: Commit**

```bash
git add backend/src/admin/app.tsx backend/src/admin/extensions/moderation/actions.tsx
git commit -m "feat(moderation): admin document actions Approve/Reject with reason dialog"
```

---

### Task 9: Admin UI — страница «Модерация» (статистика + очереди)

**Files:**

- Create: `backend/src/admin/extensions/moderation/StatsPage.tsx`

- [ ] **Step 1: Создать StatsPage.tsx**

```tsx
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box, Flex, Loader, Main, Typography } from '@strapi/design-system'
import { useFetchClient } from '@strapi/strapi/admin'

interface ModerationStats {
  queue: { vacancies: number; resumes: number; companies: number; reports: number }
  avgProcessingHours: number | null
  decidedLast7Days: number
}

const cmModerationUrl = (uid: string) =>
  `/admin/content-manager/collection-types/${uid}?page=1&pageSize=20&filters[$and][0][status][$eq]=moderation`

const QUEUES: { key: keyof ModerationStats['queue']; label: string; href: string }[] = [
  { key: 'vacancies', label: 'Вакансии', href: cmModerationUrl('api::vacancy.vacancy') },
  { key: 'resumes', label: 'Резюме', href: cmModerationUrl('api::resume.resume') },
  { key: 'companies', label: 'Компании', href: cmModerationUrl('api::company.company') },
  {
    key: 'reports',
    label: 'Жалобы',
    href: '/admin/content-manager/collection-types/api::report.report?page=1&pageSize=20&filters[$and][0][status][$eq]=pending',
  },
]

const StatCard = ({ label, value, href }: { label: string; value: string; href?: string }) => (
  <Box background="neutral0" hasRadius shadow="tableShadow" padding={6} style={{ minWidth: 180 }}>
    <Typography variant="sigma" textColor="neutral600" tag="p">
      {label}
    </Typography>
    <Typography variant="alpha" tag="p">
      {value}
    </Typography>
    {href ? (
      <Typography variant="pi" tag="p">
        <a href={href}>Открыть очередь →</a>
      </Typography>
    ) : null}
  </Box>
)

const StatsPage = () => {
  const { get } = useFetchClient()
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    get('/moderation/stats')
      .then(({ data }: { data: ModerationStats }) => setStats(data))
      .catch(() => setError(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Main padding={8}>
      <Typography variant="alpha" tag="h1">
        Модерация
      </Typography>
      <Box paddingTop={6}>
        {error ? (
          <Typography textColor="danger600">Не удалось загрузить статистику</Typography>
        ) : !stats ? (
          <Loader>Загрузка…</Loader>
        ) : (
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Flex gap={4} wrap="wrap">
              {QUEUES.map((q) => (
                <StatCard
                  key={q.key}
                  label={`${q.label} в очереди`}
                  value={String(stats.queue[q.key])}
                  href={q.href}
                />
              ))}
            </Flex>
            <Flex gap={4} wrap="wrap">
              <StatCard
                label="Среднее время обработки"
                value={stats.avgProcessingHours === null ? '—' : `${stats.avgProcessingHours} ч`}
              />
              <StatCard label="Решений за 7 дней" value={String(stats.decidedLast7Days)} />
            </Flex>
          </Flex>
        )}
      </Box>
    </Main>
  )
}

export default StatsPage
```

- [ ] **Step 2: Собрать админку**

Run: `pnpm build`
Expected: сборка успешна (проверяет и app.tsx, и actions.tsx, и StatsPage.tsx). При ошибках типов в компонентах design-system — сверить пропсы с typings в `node_modules/.pnpm/@strapi+design-system@*/`.

- [ ] **Step 3: Ручная проверка в браузере (нужна БД)**

```bash
pnpm dev
```

Чеклист:

1. В админке (http://localhost:1337/admin) в левом меню появился пункт «Модерация» → страница открывается, карточки статистики видны, ссылки «Открыть очередь» ведут на отфильтрованные списки.
2. Создать тестовую вакансию со статусом `moderation` (через Content Manager), открыть её — в правой панели видны кнопки «Одобрить» и «Отклонить».
3. «Отклонить» → модал с выбором причины; выбрать `other` без комментария → ошибка валидации; с комментарием → статус `rejected`, `rejectionReason`/`rejectionComment` заполнены.
4. Вернуть статус `moderation`, нажать «Одобрить» → статус `published`, у вакансии выставлен `expiresAt` (+60 дней).
5. В ModerationLog появились записи `submitted`/`approved`/`rejected` с `moderatorName`.
6. У записи со статусом `draft` кнопок модерации нет.
7. Открыть жалобу (Report) со статусом `pending` — видны кнопки «Жалоба подтверждена» и «Отклонить жалобу»; после нажатия статус меняется на `resolved`/`dismissed`, в ModerationLog появляется запись `report_resolved`/`report_dismissed` с модератором.

- [ ] **Step 4: Commit**

```bash
git add backend/src/admin/extensions/moderation/StatsPage.tsx
git commit -m "feat(moderation): admin stats page with queue counts and processing time"
```

---

### Task 10: Финализация — типы, полный прогон, документация

**Files:**

- Modify: `backend/types/generated/contentTypes.d.ts`
- Modify: `docs/sprint-plan.md` (секция Sprint 8 Backend, строки 282–288)
- Modify: `CLAUDE.md` (добавить секцию «Выполнено (Sprint 8 Backend)»)

- [ ] **Step 1: Перегенерировать типы content types (нужна БД)**

Run из `backend/`: `pnpm exec strapi ts:generate-types`
Expected: в `types/generated/contentTypes.d.ts` появились `ApiModerationLogModerationLog`, поля `rejectionReason`/`rejectionComment` у vacancy/resume/company, новый enum статусов report. Если команда недоступна — типы обновляются автоматически при `pnpm dev`; проверить diff файла.

- [ ] **Step 2: Полный прогон тестов и сборка**

```bash
pnpm test
pnpm build
```

Expected: все тесты PASS, сборка успешна.

- [ ] **Step 3: Отметить чекбоксы Sprint 8 Backend в docs/sprint-plan.md**

Заменить `- [ ]` на `- [x]` для всех 7 пунктов секции «Backend (Strapi Admin)» Sprint 8 (строки 282–288).

- [ ] **Step 4: Обновить CLAUDE.md**

Добавить после секции «Выполнено (Sprint 7 Frontend …)» и перед «Текущий шаг»:

```markdown
Выполнено (Sprint 8 Backend — Moderation):

- Content type: ModerationLog (audit log: entityType, entityDocumentId, action, reason, comment, moderatorId/Name)
- Поля `rejectionReason` (8 причин) + `rejectionComment` добавлены в Vacancy, Resume, Company
- Report status enum: pending/resolved/dismissed (было pending/reviewed/resolved)
- `src/services/moderation-utils.ts` — причины отклонения, метки, `validateRejection`, `computeAvgProcessingHours` + тесты
- `src/services/moderation.service.ts` — `approveEntity`, `rejectEntity`, `decideReport`, `getModerationStats`, `logModeration`
- Admin-роуты (type: 'admin', policy `admin::isAuthenticatedAdmin`, регистрация в `src/index.ts` register): POST /moderation/:entityType/:documentId/approve|reject, POST /moderation/reports/:documentId/resolve|dismiss, GET /moderation/stats
- Lifecycles (vacancy/resume/company): status=moderation → лог `submitted`; status=rejected → уведомление `moderation_rejected` с причиной; vacancy published → `moderation_approved` (закрыт TODO Sprint 8)
- `buildNotificationData` — generic entityType/entityId для moderation\_\* уведомлений
- Admin UI (`src/admin/app.tsx`): Document Actions «Одобрить»/«Отклонить» (модал с причиной) для vacancy/resume/company, «Жалоба подтверждена»/«Отклонить жалобу» для report, пункт меню «Модерация» со страницей статистики (очереди + среднее время обработки + решения за 7 дней)
- Кредит при отклонении вакансии возвращается автоматически (лимит считает только moderation/published)
```

И заменить «Текущий шаг — Sprint 8 (Moderation).» на «Текущий шаг — Sprint 8 Frontend (Moderation).»

- [ ] **Step 5: Commit**

```bash
git add backend/types/generated/contentTypes.d.ts docs/sprint-plan.md CLAUDE.md
git commit -m "docs: mark Sprint 8 Backend (Moderation) as completed"
```

---

## Известные ограничения (зафиксировать, не чинить в этом спринте)

- Ручная смена статуса через стандартный Content Manager UI (не через кнопки) отправит уведомления и лог `submitted`, но записи `approved`/`rejected` в ModerationLog не будет (нет контекста «кто»). Модераторам работать через кнопки.
- «Take action» по жалобе = модератор вручную открывает целевую сущность и отклоняет её; автоматической связки Report → reject entity нет (в спеке помечено как решение модератора).
- `avgProcessingHours` считается по последним 500 записям лога — при больших объёмах достаточно для оценки.
- Уведомление при затянувшейся модерации (>48ч, TBD в moderation-system.md) — не входит в спринт (backlog).

## Внимание при выполнении

- В рабочей копии `main` есть незакоммиченные изменения (Sprint 7 хвосты: lifecycles, cron-tasks, seed-permissions и др.). Выполнять план в отдельном worktree от `main` (skill superpowers:using-git-worktrees) — не потерять и не подхватить чужие изменения.
- `exactOptionalPropertyTypes` в backend не включён (это frontend-паттерн), но conditional spread уже используется в коде плана — оставить как есть.
