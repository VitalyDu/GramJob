# Auto-Moderation Submit & Entity-Aware Notifications Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Резюме и компании автоматически уходят на модерацию при создании и после редактирования (минуя `draft`); уведомления о результате модерации содержат тип сущности («Публикация вакансии одобрена» вместо «Публикация одобрена»).

**Architecture:** Вакансии уже отправляются на модерацию при создании/редактировании — приводим resume и company к тому же поведению. Заголовок уведомления формируется динамически из `entityType` в `templateData`.

**Tech Stack:** Strapi 5, TypeScript, Vitest (тесты в `backend/tests/unit/`)

---

## Файлы

**Изменить:**

- `backend/src/services/notification.service.ts` — `buildNotificationTitle` принимает `templateData?`
- `backend/tests/unit/notification-service.test.ts` — тесты на entity-aware заголовки
- `backend/src/api/resume/services/resume.ts` — `moderationStatus: 'draft'` → `'moderation'`
- `backend/src/api/resume/services/resume-utils.ts` — удалить `publishedTransitionsOnEditResume`
- `backend/src/api/resume/content-types/resume/lifecycles.ts` — добавить `afterCreate`
- `backend/src/api/resume/controllers/resume.ts` — убрать использование `publishedTransitionsOnEditResume`, всегда ставить `moderation` при edit
- `backend/tests/unit/resume-utils.test.ts` — удалить блок тестов `publishedTransitionsOnEditResume`
- `backend/src/api/company/services/company.ts` — `moderationStatus: 'draft'` → `'moderation'`
- `backend/src/api/company/content-types/company/lifecycles.ts` — добавить `afterCreate`
- `backend/src/api/company/controllers/company.ts` — добавить `updateData.moderationStatus = 'moderation'` в update

---

## Task 1: Entity-aware notification titles

**Files:**

- Modify: `backend/src/services/notification.service.ts`
- Modify: `backend/tests/unit/notification-service.test.ts`

- [ ] **Step 1: Добавить падежные метки и обновить `buildNotificationTitle`**

В `backend/src/services/notification.service.ts` заменить функцию `buildNotificationTitle`:

```ts
const ENTITY_TYPE_LABELS: Record<string, string> = {
  vacancy: 'вакансии',
  resume: 'резюме',
  company: 'компании',
}

export function buildNotificationTitle(
  type: string,
  templateData?: Record<string, unknown>
): string {
  if (type === 'moderation_approved' || type === 'moderation_rejected') {
    const entityType = templateData?.['entityType'] as string | undefined
    const entityLabel = entityType ? (ENTITY_TYPE_LABELS[entityType] ?? null) : null
    const action = type === 'moderation_approved' ? 'одобрена' : 'отклонена'
    if (entityLabel) return `Публикация ${entityLabel} ${action}`
  }
  return NOTIFICATION_TITLES[type] ?? 'Уведомление'
}
```

В `NOTIFICATION_TITLES` записи `moderation_approved`/`moderation_rejected` оставить как запасные (fallback).

- [ ] **Step 2: Передать `templateData` в `buildNotificationTitle` внутри `sendNotification`**

В той же функции `sendNotification` (строка ~97) изменить:

```ts
// было:
title: buildNotificationTitle(type),
// стало:
title: buildNotificationTitle(type, templateData),
```

- [ ] **Step 3: Обновить тесты `buildNotificationTitle`**

В `backend/tests/unit/notification-service.test.ts` добавить в блок `buildNotificationTitle`:

```ts
it('moderation_approved + vacancy → "Публикация вакансии одобрена"', () => {
  expect(
    buildNotificationTitle('moderation_approved', { entityType: 'vacancy', entityId: 'v1' })
  ).toBe('Публикация вакансии одобрена')
})

it('moderation_approved + resume → "Публикация резюме одобрена"', () => {
  expect(
    buildNotificationTitle('moderation_approved', { entityType: 'resume', entityId: 'r1' })
  ).toBe('Публикация резюме одобрена')
})

it('moderation_approved + company → "Публикация компании одобрена"', () => {
  expect(
    buildNotificationTitle('moderation_approved', { entityType: 'company', entityId: 'c1' })
  ).toBe('Публикация компании одобрена')
})

it('moderation_rejected + vacancy → "Публикация вакансии отклонена"', () => {
  expect(
    buildNotificationTitle('moderation_rejected', { entityType: 'vacancy', entityId: 'v1' })
  ).toBe('Публикация вакансии отклонена')
})

it('moderation_rejected + resume → "Публикация резюме отклонена"', () => {
  expect(
    buildNotificationTitle('moderation_rejected', { entityType: 'resume', entityId: 'r1' })
  ).toBe('Публикация резюме отклонена')
})

it('moderation_rejected + company → "Публикация компании отклонена"', () => {
  expect(
    buildNotificationTitle('moderation_rejected', { entityType: 'company', entityId: 'c1' })
  ).toBe('Публикация компании отклонена')
})

it('moderation_approved без templateData → fallback строка', () => {
  expect(buildNotificationTitle('moderation_approved')).toBe('Публикация одобрена')
})

it('moderation_approved с неизвестным entityType → fallback строка', () => {
  expect(
    buildNotificationTitle('moderation_approved', { entityType: 'unknown_type', entityId: 'x' })
  ).toBe('Публикация одобрена')
})
```

- [ ] **Step 4: Запустить тесты**

```bash
cd /Users/vitaly/work/GramJob/backend
pnpm test -- --testPathPattern="notification-service" --no-coverage
```

Ожидаемый результат: все тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/notification.service.ts \
        backend/tests/unit/notification-service.test.ts
git commit -m "feat(notifications): entity-aware moderation notification titles"
```

---

## Task 2: Resume — авто-отправка на модерацию при создании

**Files:**

- Modify: `backend/src/api/resume/services/resume.ts`
- Modify: `backend/src/api/resume/content-types/resume/lifecycles.ts`

- [ ] **Step 1: Изменить начальный статус резюме**

В `backend/src/api/resume/services/resume.ts` строка 81:

```ts
// было:
moderationStatus: 'draft',
// стало:
moderationStatus: 'moderation',
```

- [ ] **Step 2: Добавить `afterCreate` в lifecycle резюме**

В `backend/src/api/resume/content-types/resume/lifecycles.ts` добавить тип события и хук после существующих типов:

```ts
type ResumeAfterCreateEvent = {
  result: {
    documentId?: string
    moderationStatus?: string
    title?: string
  }
  params: { data?: Record<string, unknown> }
}
```

В объект `export default { ... }` добавить перед `beforeUpdate`:

```ts
async afterCreate(event: ResumeAfterCreateEvent) {
  if (event.result.moderationStatus !== 'moderation') return
  const s = globalThis.strapi as Core.Strapi
  const documentId = event.result.documentId
  if (!documentId) return
  try {
    const resume = await (s.documents as any)('api::resume.resume').findOne({
      documentId,
      populate: { user: { fields: ['id'] } },
      fields: ['documentId', 'title'],
    })
    await logModeration(s, {
      entityType: 'resume',
      entityDocumentId: documentId,
      entityTitle: resume?.title ?? '',
      action: 'submitted',
    })
    notifyAdmins(s, {
      entityType: 'resume',
      title: resume?.title ?? '',
      ...(resume?.user?.id ? { authorId: resume.user.id } : {}),
      documentId,
    })
  } catch (err) {
    s.log.error('[resume] afterCreate moderation log failed', err)
  }
},
```

- [ ] **Step 3: Запустить тесты (нет unit тестов для lifecycle, проверяем TypeScript)**

```bash
cd /Users/vitaly/work/GramJob/backend
pnpm tsc --noEmit
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/resume/services/resume.ts \
        backend/src/api/resume/content-types/resume/lifecycles.ts
git commit -m "feat(resume): auto-submit to moderation on create"
```

---

## Task 3: Resume — авто-отправка на модерацию при редактировании

**Files:**

- Modify: `backend/src/api/resume/services/resume-utils.ts`
- Modify: `backend/src/api/resume/controllers/resume.ts`
- Modify: `backend/tests/unit/resume-utils.test.ts`

- [ ] **Step 1: Удалить `publishedTransitionsOnEditResume` из resume-utils**

В `backend/src/api/resume/services/resume-utils.ts` удалить функцию целиком:

```ts
// УДАЛИТЬ эти строки:
export function publishedTransitionsOnEditResume(status: string): boolean {
  return status === 'published'
}
```

Файл после удаления должен содержать только `canPublishResume`, `canEditResume`, `canArchiveResume`.

- [ ] **Step 2: Удалить тесты `publishedTransitionsOnEditResume` из resume-utils.test.ts**

В `backend/tests/unit/resume-utils.test.ts` удалить весь блок `describe('publishedTransitionsOnEditResume', ...)` (строки 74–86).

- [ ] **Step 3: Обновить import и логику в resume controller**

В `backend/src/api/resume/controllers/resume.ts` строка 6 — убрать `publishedTransitionsOnEditResume` из импорта:

```ts
import { canPublishResume, canEditResume, canArchiveResume } from '../services/resume-utils'
```

Строки 382–384 — заменить условный блок на безусловную установку статуса (строки 382–384 в файле):

```ts
// было:
if (publishedTransitionsOnEditResume(status)) {
  updateData.moderationStatus = 'draft'
}

const updated = await (strapi.documents as any)('api::resume.resume').update({
// стало:
updateData.moderationStatus = 'moderation'

const updated = await (strapi.documents as any)('api::resume.resume').update({
```

- [ ] **Step 4: Запустить тесты**

```bash
cd /Users/vitaly/work/GramJob/backend
pnpm test -- --testPathPattern="resume-utils" --no-coverage
```

Ожидаемый результат: все тесты зелёные (блок `publishedTransitionsOnEditResume` отсутствует).

- [ ] **Step 5: TypeScript-проверка**

```bash
cd /Users/vitaly/work/GramJob/backend
pnpm tsc --noEmit
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/resume/services/resume-utils.ts \
        backend/src/api/resume/controllers/resume.ts \
        backend/tests/unit/resume-utils.test.ts
git commit -m "feat(resume): auto-submit to moderation on edit, remove publishedTransitionsOnEditResume"
```

---

## Task 4: Company — авто-отправка на модерацию при создании

**Files:**

- Modify: `backend/src/api/company/services/company.ts`
- Modify: `backend/src/api/company/content-types/company/lifecycles.ts`

- [ ] **Step 1: Изменить начальный статус компании**

В `backend/src/api/company/services/company.ts` строка 36:

```ts
// было:
moderationStatus: 'draft',
// стало:
moderationStatus: 'moderation',
```

- [ ] **Step 2: Добавить `afterCreate` в lifecycle компании**

В `backend/src/api/company/content-types/company/lifecycles.ts` добавить тип события:

```ts
type CompanyAfterCreateEvent = {
  result: {
    documentId?: string
    moderationStatus?: string
    name?: string
  }
  params: { data?: Record<string, unknown> }
}
```

В объект `export default { ... }` добавить перед `beforeUpdate`:

```ts
async afterCreate(event: CompanyAfterCreateEvent) {
  if (event.result.moderationStatus !== 'moderation') return
  const s = globalThis.strapi as Core.Strapi
  const documentId = event.result.documentId
  if (!documentId) return
  try {
    const company = await (s.documents as any)('api::company.company').findOne({
      documentId,
      populate: { owner: { fields: ['id'] } },
      fields: ['documentId', 'name'],
    })
    await logModeration(s, {
      entityType: 'company',
      entityDocumentId: documentId,
      entityTitle: company?.name ?? '',
      action: 'submitted',
    })
    notifyAdmins(s, {
      entityType: 'company',
      title: company?.name ?? '',
      ...(company?.owner?.id ? { authorId: company.owner.id } : {}),
      documentId,
    })
  } catch (err) {
    s.log.error('[company] afterCreate moderation log failed', err)
  }
},
```

- [ ] **Step 3: TypeScript-проверка**

```bash
cd /Users/vitaly/work/GramJob/backend
pnpm tsc --noEmit
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/company/services/company.ts \
        backend/src/api/company/content-types/company/lifecycles.ts
git commit -m "feat(company): auto-submit to moderation on create"
```

---

## Task 5: Company — авто-отправка на модерацию при редактировании

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

- [ ] **Step 1: Добавить установку статуса `moderation` при редактировании компании**

В `backend/src/api/company/controllers/company.ts` вставить одну строку между строками 283 и 285 (после блока генерации slug, перед вызовом `update`):

```ts
      if (updateData.name !== undefined && updateData.name !== existing.name) {
        const baseSlug = toSlug(updateData.name as string)
        updateData.slug = await svc().generateUniqueSlug(baseSlug, id)
      }

      // Любое редактирование возвращает компанию на модерацию
      updateData.moderationStatus = 'moderation'

      const updated = await strapi.documents('api::company.company').update({
```

`beforeUpdate` lifecycle уже перехватывает переход на `moderation` и вызывает `logModeration` + `notifyAdmins` — дополнительных изменений в lifecycle не требуется.

- [ ] **Step 2: TypeScript-проверка**

```bash
cd /Users/vitaly/work/GramJob/backend
pnpm tsc --noEmit
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 3: Запустить все тесты**

```bash
cd /Users/vitaly/work/GramJob/backend
pnpm test --no-coverage
```

Ожидаемый результат: все тесты зелёные.

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(company): auto-submit to moderation on edit"
```

---

## Итог

После выполнения всех задач:

- Вакансии: без изменений (уже создаются и редактируются в `moderation`)
- Резюме: создаются в `moderation`, редактирование переводит в `moderation` (не в `draft`)
- Компании: создаются в `moderation`, редактирование переводит в `moderation`
- Уведомления: «Публикация вакансии/резюме/компании одобрена/отклонена»
- Тосты и список уведомлений на фронте получают правильные заголовки автоматически (через `n.title` из БД)
