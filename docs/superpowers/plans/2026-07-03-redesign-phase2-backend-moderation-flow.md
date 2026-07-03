# UI/UX Redesign — Phase 2: Backend (флоу модерации вакансий + счётчики на карточках) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создание вакансии сразу отправляет её на модерацию (со списанием кредита при создании), любое редактирование возвращает вакансию на модерацию, публичные карточки вакансий отдают счётчики просмотров и откликов.

**Architecture:** Кредит-проверка переносится из `publish` в `create` (сам `publish` остаётся для повторной отправки rejected/expired/старых draft). Сервис `createVacancy` создаёт вакансию сразу в `status: 'moderation'`. В `update` безусловный переход в `moderation` заменяет условный `publishedTransitionsOnEdit`. Audit-лог «submitted» добавляется в `afterCreate` lifecycle (сейчас только в `afterUpdate`). `views` и `applicationsCount` добавляются в `VACANCY_CARD_FIELDS`.

**Tech Stack:** Strapi 5, PostgreSQL, Jest (backend unit tests в `backend/tests/unit/`), Next.js/MobX/Vitest (frontend-обвязка флоу).

**Спека:** `docs/ui-ux-redesign.md` §8, §9, §10, §14.

**Решения (согласованы с пользователем 2026-07-03):**

- Кредит списывается при создании вакансии (POST /vacancies). При отклонении модератором кредит возвращается автоматически — лимит считает только вакансии в `moderation/published` (существующая механика Sprint 3/8).
- Endpoint POST /vacancies/:id/publish сохраняется для `draft` (старые черновики), `rejected`, `expired` — там кредит списывается как раньше.
- Спека затрагивает только **вакансии** — флоу резюме и компаний не меняется (§14).

**Конвенции проекта (обязательны):**

- Коммиты **без** `Co-Authored-By`.
- Backend-тесты: Jest, `backend/tests/unit/*.test.ts` — выносить чистые функции и тестировать их.
- Команды: `pnpm -C backend test`, `pnpm -C backend typecheck`.

---

## Контекст: что есть сейчас (проверено 2026-07-03)

| Что                          | Где                                                        | Текущее поведение                                                                                         |
| ---------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `create` controller          | `backend/src/api/vacancy/controllers/vacancy.ts:89-183`    | создаёт без кредит-проверки, сервис ставит `status: 'draft'`                                              |
| `createVacancy` service      | `backend/src/api/vacancy/services/vacancy.ts` (~строка 71) | `status: 'draft'`                                                                                         |
| `publish` controller         | `controllers/vacancy.ts:185-228`                           | `canPublish` (draft/rejected/expired) → `checkAndConsumeVacancyCredit` → `status: 'moderation'`           |
| `update` controller          | `controllers/vacancy.ts:479-538`                           | `canEdit` (draft/rejected/published); `publishedTransitionsOnEdit` → `status: 'draft'`, `expiresAt: null` |
| `publishedTransitionsOnEdit` | `backend/src/api/vacancy/services/vacancy-utils.ts:17-19`  | только `published → draft`                                                                                |
| Lifecycle `afterUpdate`      | `content-types/vacancy/lifecycles.ts:120-128`              | лог `submitted` при переходе в `moderation`; в `afterCreate` лога нет                                     |
| `VACANCY_CARD_FIELDS`        | `controllers/vacancy.ts:37-55`                             | **без** `views` / `applicationsCount` (они только в FULL)                                                 |
| Кредит-лимит                 | `backend/src/api/vacancy/services/credit-service.ts`       | считает вакансии в `moderation/published` за месяц                                                        |
| Frontend store               | `frontend/src/stores/VacancyStore.ts`                      | `createVacancy` не обрабатывает 403 LIMIT_REACHED (обрабатывает только `publishVacancy`)                  |

---

### Task 1: Утилита moderationTransitionsOnEdit + правка vacancy-utils

По спеке §9 любое редактирование → `moderation`. `canEdit` разрешает draft/rejected/published — все три после правки уходят в `moderation`, поэтому условная функция больше не нужна: переход становится безусловным. Удаляем `publishedTransitionsOnEdit` и её тесты.

**Files:**

- Modify: `backend/src/api/vacancy/services/vacancy-utils.ts`
- Modify: `backend/tests/unit/vacancy-utils.test.ts` (найти точное имя: `ls backend/tests/unit | grep vacancy`)

- [ ] **Step 1: Удалить `publishedTransitionsOnEdit` из vacancy-utils.ts**

Итоговое содержимое файла:

```ts
export function canPublish(status: string): boolean {
  return status === 'draft' || status === 'rejected' || status === 'expired'
}

export function canBoost(status: string): boolean {
  return status === 'published'
}

export function canArchive(status: string): boolean {
  return ['draft', 'published', 'rejected', 'expired'].includes(status)
}

export function canEdit(status: string): boolean {
  return ['draft', 'rejected', 'published'].includes(status)
}
```

- [ ] **Step 2: Удалить тесты `publishedTransitionsOnEdit`**

В тест-файле vacancy-utils удалить `describe`/`it`-блоки для `publishedTransitionsOnEdit`.

- [ ] **Step 3: Прогнать тесты**

Run: `pnpm -C backend test && pnpm -C backend typecheck`
Expected: FAIL typecheck — `controllers/vacancy.ts` ещё импортирует `publishedTransitionsOnEdit`. Это ожидаемо, исправляется в Task 3. Не коммитить, перейти к Task 2–3 (коммит общий в Task 3).

---

### Task 2: Сервис createVacancy → status 'moderation'

**Files:**

- Modify: `backend/src/api/vacancy/services/vacancy.ts` (~строка 71)

- [ ] **Step 1: Заменить статус в createVacancy**

```ts
        // Спека redesign §8: вакансия сразу уходит на модерацию, минуя draft
        status: 'moderation',
```

(вместо `status: 'draft',`)

- [ ] **Step 2: Не коммитить — перейти к Task 3**

---

### Task 3: Controller create — списание кредита; update — безусловный переход в moderation

**Files:**

- Modify: `backend/src/api/vacancy/controllers/vacancy.ts`

- [ ] **Step 1: Убрать импорт `publishedTransitionsOnEdit`**

В шапке файла из импорта `./../services/vacancy-utils` удалить `publishedTransitionsOnEdit` (оставить `canPublish, canBoost, canArchive, canEdit`).

- [ ] **Step 2: В `create` добавить кредит-проверку перед созданием**

После блока проверки `companyId` (строка ~147) и ПЕРЕД `const vacancy = await svc().createVacancy(...)` вставить (идентично блоку в `publish`):

```ts
try {
  await checkAndConsumeVacancyCredit(strapi, user.id)
} catch (err: any) {
  if (err?.code === 'LIMIT_REACHED') {
    ctx.status = 403
    return ctx.send({
      error: {
        code: 'LIMIT_REACHED',
        message: 'Vacancy limit reached',
        details: err.details,
      },
    })
  }
  throw err
}
```

- [ ] **Step 3: В `update` заменить условный переход**

Заменить блок (строки ~525-528):

```ts
if (publishedTransitionsOnEdit(status)) {
  updateData.status = 'draft'
  updateData.expiresAt = null
}
```

на:

```ts
// Спека redesign §9: любое редактирование возвращает вакансию на модерацию
updateData.status = 'moderation'
updateData.expiresAt = null
```

- [ ] **Step 4: Прогнать тесты и typecheck**

Run: `pnpm -C backend typecheck && pnpm -C backend test`
Expected: 0 ошибок TS; тесты зелёные (падение любых тестов на `draft`-флоу — чинить обновлением ожиданий на `moderation`).

- [ ] **Step 5: Commit (Tasks 1–3)**

```bash
git add backend/src/api/vacancy backend/tests/unit
git commit -m "feat(backend): vacancy create/edit go straight to moderation, credit consumed on create"
```

---

### Task 4: Lifecycle afterCreate — audit-лог «submitted»

Сейчас лог `submitted` пишется только в `afterUpdate`. Вакансии, создаваемые сразу в `moderation`, должны попадать в очередь модерации с тем же audit-логом.

**Files:**

- Modify: `backend/src/api/vacancy/content-types/vacancy/lifecycles.ts` (метод `afterCreate`, строки ~93-96)

- [ ] **Step 1: Дополнить afterCreate**

Заменить:

```ts
  async afterCreate(event: VacancyAfterEvent) {
    // No await: raw SQL runs after Strapi commits the transaction to avoid lock deadlock
    updateSearchVector(event.result.id)
  },
```

на:

```ts
  async afterCreate(event: VacancyAfterEvent) {
    // No await: raw SQL runs after Strapi commits the transaction to avoid lock deadlock
    updateSearchVector(event.result.id)

    // Вакансии создаются сразу в status=moderation — audit-лог как при submit
    if (event.result.status !== 'moderation') return
    const s = globalThis.strapi as Core.Strapi
    const documentId = event.result.documentId
    if (!documentId) return
    try {
      await logModeration(s, {
        entityType: 'vacancy',
        entityDocumentId: documentId,
        entityTitle: ((event.params.data?.['title'] as string) ?? '') || '',
        action: 'submitted',
      })
    } catch (err) {
      s.log.error('[vacancy] afterCreate moderation log failed', err)
    }
  },
```

- [ ] **Step 2: Прогнать тесты и typecheck**

Run: `pnpm -C backend typecheck && pnpm -C backend test`
Expected: 0 ошибок, тесты зелёные.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/vacancy/content-types/vacancy/lifecycles.ts
git commit -m "feat(backend): log moderation submitted on vacancy create"
```

---

### Task 5: views + applicationsCount в публичных карточках

**Files:**

- Modify: `backend/src/api/vacancy/controllers/vacancy.ts:37-55` (`VACANCY_CARD_FIELDS`)

- [ ] **Step 1: Добавить поля в VACANCY_CARD_FIELDS**

```ts
const VACANCY_CARD_FIELDS = [
  'documentId',
  'title',
  'country',
  'city',
  'workFormat',
  'employmentType',
  'seniority',
  'salaryFrom',
  'salaryTo',
  'salaryCurrency',
  'urgent',
  'topPlacement',
  'highlighted',
  'sourceType',
  'status',
  'expiresAt',
  'createdAt',
  'views',
  'applicationsCount',
] as const
```

В `VACANCY_FULL_FIELDS` удалить дубли `'views'` и `'applicationsCount'` (они придут из spread `...VACANCY_CARD_FIELDS`; `'uniqueViews'` остаётся только в FULL).

- [ ] **Step 2: Прогнать тесты и typecheck**

Run: `pnpm -C backend typecheck && pnpm -C backend test`
Expected: 0 ошибок, тесты зелёные.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/vacancy/controllers/vacancy.ts
git commit -m "feat(backend): expose views and applicationsCount in vacancy card fields"
```

---

### Task 6: Frontend — обработка нового флоу создания

`VacancyStore.createVacancy` должен обрабатывать 403 LIMIT_REACHED (как `publishVacancy`), а `CreateVacancyClient` — показывать `UpsellModal`. Формулировки кнопок/тостов меняются на «Отправить на модерацию».

**Files:**

- Modify: `frontend/src/stores/VacancyStore.ts` (метод `createVacancy`)
- Modify: `frontend/src/stores/VacancyStore.test.ts`
- Modify: `frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.tsx`
- Modify: `frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.tsx`
- Modify: `frontend/src/components/vacancy/VacancyForm.tsx` (текст submit-кнопки)

- [ ] **Step 1: Написать падающий тест на LIMIT_REACHED в createVacancy**

В `VacancyStore.test.ts` добавить (по образцу существующего теста `publishVacancy` LIMIT_REACHED — найти его и скопировать структуру моков):

```ts
it('createVacancy ставит limitReached при 403 LIMIT_REACHED', async () => {
  apiMock.post.mockRejectedValueOnce(
    Object.assign(new Error('Vacancy limit reached'), {
      status: 403,
      code: 'LIMIT_REACHED',
      details: { used: 3, limit: 3 },
    })
  )
  const store = new VacancyStore(rootStore)
  const result = await store.createVacancy(validInput)
  expect(result).toBeNull()
  expect(store.limitReached).toBe(true)
})
```

⚠️ Перед написанием открыть существующий тест `publishVacancy` + реализацию `publishVacancy` в сторе и повторить их фактическую структуру ошибок (как API-клиент прокидывает `code`/`details`) — тест выше согласовать с ней.

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm -C frontend test -- VacancyStore`
Expected: FAIL (createVacancy сейчас пробрасывает/глотает ошибку без `limitReached`).

- [ ] **Step 3: Обновить createVacancy в сторе**

В `createVacancy` добавить ту же обработку, что в `publishVacancy`: при ошибке с `code === 'LIMIT_REACHED'` установить `this.limitReached = true` (+ `limitDetails`, если стор их хранит), вернуть `null`, не пробрасывать.

- [ ] **Step 4: Запустить тесты стора**

Run: `pnpm -C frontend test -- VacancyStore`
Expected: PASS.

- [ ] **Step 5: CreateVacancyClient — UpsellModal + тост**

В `CreateVacancyClient.tsx`:

- после `const created = await vacancy.createVacancy(data)`: если `created === null` и `vacancy.limitReached` — НЕ редиректить (UpsellModal откроется по существующему паттерну из `MyVacanciesClient` — скопировать его: рендер `<UpsellModal open={vacancy.limitReached} onClose={() => vacancy.clearLimitReached()} />`);
- при успехе: `toast.success('Вакансия отправлена на модерацию')` (импорт `toast` из `sonner`) и редирект на `/dashboard/vacancies` как сейчас.

В `EditVacancyClient.tsx` при успешном сохранении: `toast.success('Изменения сохранены — вакансия отправлена на модерацию')`.

- [ ] **Step 6: VacancyForm — текст кнопки**

Submit-кнопка формы создания: «Отправить на модерацию» (в режиме редактирования — «Сохранить и отправить на модерацию»). Форма уже различает режимы (проверить props `VacancyForm`; если режим определяется по наличию `initialData`/`vacancy` — использовать его).

- [ ] **Step 7: Полный прогон**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test`
Expected: 0 ошибок, тесты зелёные.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/stores/VacancyStore.ts frontend/src/stores/VacancyStore.test.ts frontend/src/app/dashboard/vacancies frontend/src/components/vacancy/VacancyForm.tsx
git commit -m "feat(frontend): vacancy create/edit submits to moderation with limit handling"
```

---

### Task 7: Ручная верификация флоу (backend + frontend вместе)

- [ ] **Step 1: Поднять окружение**

```bash
docker compose up -d
pnpm -C backend develop   # терминал 1
pnpm -C frontend dev      # терминал 2
```

- [ ] **Step 2: Чеклист**

- [ ] Создание вакансии → статус сразу `moderation`, кредит списан (LimitBar в дашборде уменьшился)
- [ ] Создание при исчерпанном лимите Free (3) → UpsellModal, вакансия не создана
- [ ] В Strapi Admin: вакансия видна в очереди модерации, в ModerationLog есть запись `submitted`
- [ ] Одобрение в админке → `published`, уведомление `moderation_approved`
- [ ] Редактирование published-вакансии → статус `moderation`, `expiresAt` сброшен, повторный лог `submitted`
- [ ] Отклонение → `rejected`; кредит вернулся (лимит считает только moderation/published); кнопка «Опубликовать» на rejected работает и списывает кредит
- [ ] GET /vacancies (публичный список) → в JSON карточек есть `views` и `applicationsCount`

---

## Self-Review

- Спека §8 (create → moderation) — Tasks 2, 3, 6 ✅; §9 (edit → moderation независимо от статуса) — Task 3 Step 3 ✅ (для всех статусов, разрешённых `canEdit`); §10 (API-часть счётчиков) — Task 5 ✅; §14 (кредиты/лимиты не меняются) — механика лимита не тронута, изменён только момент списания (решение согласовано) ✅.
- Audit-цепочка модерации сохранена: submitted пишется и при создании (Task 4).
- Тип `Vacancy` на фронте уже содержит `views?`/`applicationsCount?` (`frontend/src/types/api.ts:205-207`) — правок типов не требуется.
- UI-отображение 👁/📨 на карточке — Phase 3 (Task «VacancyCard»).
