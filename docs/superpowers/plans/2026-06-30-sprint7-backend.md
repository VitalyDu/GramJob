# Sprint 7 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать систему in-app + Telegram уведомлений, бот-команды и аналитику вакансий/резюме.

**Architecture:** Единый `sendNotification(strapi, payload)` сервис создаёт запись в таблице Notification и отправляет Telegram-сообщение через TelegramQueue (50ms между отправками). Lifecycle hooks и cron-задачи вызывают этот сервис. Аналитика агрегируется ежедневно в 01:00 UTC: дельта за день сохраняется в VacancyAnalytics / ResumeAnalytics.

**Tech Stack:** Strapi 5, TypeScript, Jest, Telegram Bot API, PostgreSQL.

> **Два независимых подсистемы:** Tasks 1–9 (Notifications) и Tasks 10–12 (Analytics) могут выполняться параллельно, если есть два исполнителя. Каждая подсистема компилируется и тестируется самостоятельно.

---

## File Map

**Создаются:**

- `backend/src/api/notification/content-types/notification/schema.json`
- `backend/src/services/notification.service.ts`
- `backend/src/api/notification/controllers/notification.ts`
- `backend/src/api/notification/routes/notification.ts`
- `backend/src/api/vacancy-analytics/content-types/vacancy-analytics/schema.json`
- `backend/src/api/resume-analytics/content-types/resume-analytics/schema.json`
- `backend/src/api/analytics/controllers/analytics.ts`
- `backend/src/api/analytics/routes/analytics.ts`
- `backend/tests/unit/notification-service.test.ts`
- `backend/tests/unit/bot-commands.test.ts`
- `backend/tests/unit/analytics-cron.test.ts`

**Изменяются:**

- `backend/src/api/payment/services/telegram-bot.ts` — добавить `sendMessage`, `TelegramQueue`
- `backend/src/api/payment/controllers/telegram-webhook.ts` — добавить обработку бот-команд
- `backend/src/api/application/content-types/application/lifecycles.ts` — подключить `sendNotification`
- `backend/src/api/resume/content-types/resume/lifecycles.ts` — подключить `sendNotification`
- `backend/src/api/company/content-types/company/lifecycles.ts` — подключить `sendNotification`
- `backend/config/cron-tasks.ts` — заменить TODO-комментарии реальными уведомлениями + новые cron-задачи
- `backend/types/generated/contentTypes.d.ts` — добавить Notification, VacancyAnalytics, ResumeAnalytics

---

## Task 1: Notification Content Type Schema

**Files:**

- Create: `backend/src/api/notification/content-types/notification/schema.json`

- [ ] **Step 1: Создать schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "notifications",
  "info": {
    "singularName": "notification",
    "pluralName": "notifications",
    "displayName": "Notification",
    "description": "In-app and Telegram push notifications"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "type": {
      "type": "enumeration",
      "enum": [
        "new_application",
        "application_approved",
        "application_rejected",
        "interview_invitation",
        "test_task",
        "offer_received",
        "resume_viewed",
        "vacancy_viewed",
        "vacancy_expiring_soon",
        "vacancy_expired",
        "subscription_expiring",
        "subscription_expired",
        "limits_reached",
        "saved_search_match",
        "moderation_approved",
        "moderation_rejected"
      ],
      "required": true
    },
    "title": {
      "type": "string",
      "required": true
    },
    "body": {
      "type": "text",
      "required": true
    },
    "isRead": {
      "type": "boolean",
      "default": false
    },
    "data": {
      "type": "json"
    }
  }
}
```

- [ ] **Step 2: Проверить что файл создан корректно**

```bash
cat backend/src/api/notification/content-types/notification/schema.json | python3 -m json.tool > /dev/null && echo "JSON valid"
```

Expected: `JSON valid`

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/notification/content-types/notification/schema.json
git commit -m "feat(sprint7): add Notification content type schema"
```

---

## Task 2: sendMessage + TelegramQueue

**Files:**

- Modify: `backend/src/api/payment/services/telegram-bot.ts`
- Test: `backend/tests/unit/telegram-bot-send.test.ts`

Добавить в `telegram-bot.ts` после существующих функций: класс `TelegramQueue`, функцию `sendMessage`, вспомогательную `buildNotificationMessage`.

- [ ] **Step 1: Написать тесты**

Создать `backend/tests/unit/telegram-bot-send.test.ts`:

```typescript
import {
  buildNotificationMessage,
  APPLICATION_STATUS_TO_NOTIFICATION,
} from '../../src/api/payment/services/telegram-bot'

describe('buildNotificationMessage', () => {
  it('new_application содержит имя кандидата', () => {
    const msg = buildNotificationMessage('new_application', {
      vacancyTitle: 'Backend Dev',
      candidateName: 'Иван Иванов',
      vacancyId: 'abc123',
    })
    expect(msg.text).toContain('Backend Dev')
    expect(msg.text).toContain('Иван Иванов')
  })

  it('offer_received содержит эмодзи', () => {
    const msg = buildNotificationMessage('offer_received', {
      vacancyTitle: 'Frontend Dev',
      applicationId: 'x1',
    })
    expect(msg.text).toContain('🎉')
  })

  it('subscription_expiring содержит название плана', () => {
    const msg = buildNotificationMessage('subscription_expiring', { plan: 'Pro' })
    expect(msg.text).toContain('Pro')
    expect(msg.text).toContain('7')
  })

  it('saved_search_match содержит количество', () => {
    const msg = buildNotificationMessage('saved_search_match', {
      count: 5,
      searchType: 'vacancy',
    })
    expect(msg.text).toContain('5')
  })

  it('неизвестный тип не падает', () => {
    const msg = buildNotificationMessage('unknown_type' as any, {})
    expect(typeof msg.text).toBe('string')
  })
})

describe('APPLICATION_STATUS_TO_NOTIFICATION', () => {
  it('in-review → application_approved', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['in-review']).toBe('application_approved')
  })

  it('rejected → application_rejected', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['rejected']).toBe('application_rejected')
  })

  it('interview → interview_invitation', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['interview']).toBe('interview_invitation')
  })

  it('offer → offer_received', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['offer']).toBe('offer_received')
  })

  it('test-task → test_task', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['test-task']).toBe('test_task')
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd backend && pnpm test tests/unit/telegram-bot-send.test.ts 2>&1 | tail -5
```

Expected: FAIL (функции не существуют)

- [ ] **Step 3: Добавить код в telegram-bot.ts**

В конец файла `backend/src/api/payment/services/telegram-bot.ts` добавить:

```typescript
export type NotificationType =
  | 'new_application'
  | 'application_approved'
  | 'application_rejected'
  | 'interview_invitation'
  | 'test_task'
  | 'offer_received'
  | 'resume_viewed'
  | 'vacancy_viewed'
  | 'vacancy_expiring_soon'
  | 'vacancy_expired'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'limits_reached'
  | 'saved_search_match'
  | 'moderation_approved'
  | 'moderation_rejected'

export interface TelegramMessageOptions {
  parse_mode?: 'HTML' | 'Markdown'
  reply_markup?: { inline_keyboard: Array<Array<{ text: string; url: string }>> }
}

export interface TelegramMessage {
  text: string
  options?: TelegramMessageOptions
}

export const APPLICATION_STATUS_TO_NOTIFICATION: Record<string, NotificationType | undefined> = {
  'in-review': 'application_approved',
  rejected: 'application_rejected',
  interview: 'interview_invitation',
  'test-task': 'test_task',
  offer: 'offer_received',
}

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'GramJobBot'

function buildDeepLink(type: string, data: Record<string, unknown>): string | null {
  const map: Record<string, (d: Record<string, unknown>) => string | null> = {
    new_application: (d) => (d['vacancyId'] ? `vacancy_${d['vacancyId']}_applications` : null),
    application_approved: (d) => (d['applicationId'] ? `application_${d['applicationId']}` : null),
    application_rejected: (d) => (d['applicationId'] ? `application_${d['applicationId']}` : null),
    interview_invitation: (d) => (d['applicationId'] ? `application_${d['applicationId']}` : null),
    test_task: (d) => (d['applicationId'] ? `application_${d['applicationId']}` : null),
    offer_received: (d) => (d['applicationId'] ? `application_${d['applicationId']}` : null),
    vacancy_expiring_soon: (d) => (d['vacancyId'] ? `vacancy_${d['vacancyId']}` : null),
    vacancy_expired: (d) => (d['vacancyId'] ? `vacancy_${d['vacancyId']}` : null),
    subscription_expiring: () => 'subscription',
    subscription_expired: () => 'subscription',
    limits_reached: () => 'subscription',
    saved_search_match: (d) => (d['searchType'] === 'resume' ? 'resumes' : 'vacancies'),
    moderation_approved: (d) => (d['entityId'] ? `${d['entityType']}_${d['entityId']}` : null),
    moderation_rejected: (d) => (d['entityId'] ? `${d['entityType']}_${d['entityId']}` : null),
  }
  const builder = map[type]
  return builder ? builder(data) : null
}

const BUTTON_TEXTS: Partial<Record<NotificationType, string>> = {
  new_application: '👤 Посмотреть отклик',
  application_approved: '✅ Открыть контакты',
  offer_received: '🎉 Посмотреть оффер',
  subscription_expiring: '💳 Продлить подписку',
  subscription_expired: '💳 Обновить подписку',
  saved_search_match: '🔍 Посмотреть результаты',
  limits_reached: '⬆️ Апгрейд плана',
}

export function buildNotificationMessage(
  type: NotificationType | string,
  data: Record<string, unknown>
): TelegramMessage {
  const templates: Record<string, string> = {
    new_application: `📩 Новый отклик на «${data['vacancyTitle'] ?? ''}» от ${data['candidateName'] ?? 'кандидата'}`,
    application_approved: `✅ Ваш отклик на «${data['vacancyTitle'] ?? ''}» одобрен! Теперь доступны контакты работодателя`,
    application_rejected: `❌ Отклик на «${data['vacancyTitle'] ?? ''}» отклонён`,
    interview_invitation: `📅 Вас приглашают на интервью по вакансии «${data['vacancyTitle'] ?? ''}»`,
    test_task: `📝 Вам отправили тестовое задание по вакансии «${data['vacancyTitle'] ?? ''}»`,
    offer_received: `🎉 Вам сделали оффер по вакансии «${data['vacancyTitle'] ?? ''}»!`,
    resume_viewed: `👁 Ваше резюме «${data['resumeTitle'] ?? ''}» просмотрел работодатель`,
    vacancy_viewed: `👁 Вашу вакансию «${data['vacancyTitle'] ?? ''}» просмотрели ${data['views'] ?? 0} раз за вчера`,
    vacancy_expiring_soon: `⏰ Вакансия «${data['vacancyTitle'] ?? ''}» истекает через 3 дня. Продлите публикацию`,
    vacancy_expired: `🔴 Вакансия «${data['vacancyTitle'] ?? ''}» истекла. Опубликуйте заново`,
    subscription_expiring: `⚠️ Ваша подписка ${data['plan'] ?? ''} истекает через 7 дней`,
    subscription_expired: `🔴 Ваша подписка истекла. Продлите для продолжения работы`,
    limits_reached: `🚫 Исчерпан лимит ${data['limitType'] ?? ''}. Рассмотрите апгрейд`,
    saved_search_match: `🔔 ${data['count'] ?? 0} новых ${data['searchType'] === 'resume' ? 'резюме' : 'вакансий'} по вашему поиску`,
    moderation_approved: `✅ «${data['title'] ?? ''}» опубликовано после модерации`,
    moderation_rejected: `❌ «${data['title'] ?? ''}» отклонено. Причина: ${data['reason'] ?? 'см. детали'}`,
  }

  const text = templates[type] ?? `📢 Уведомление: ${type}`
  const deepLink = buildDeepLink(type, data)
  const buttonText = BUTTON_TEXTS[type as NotificationType]

  return {
    text,
    options:
      deepLink && buttonText
        ? {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: buttonText,
                    url: `https://t.me/${BOT_USERNAME}/app?startapp=${deepLink}`,
                  },
                ],
              ],
            },
          }
        : { parse_mode: 'HTML' },
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class TelegramQueue {
  private queue: Array<() => Promise<void>> = []
  private processing = false

  add(fn: () => Promise<void>): void {
    this.queue.push(fn)
    if (!this.processing) void this.process()
  }

  private async process(): Promise<void> {
    this.processing = true
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      try {
        await task()
      } catch (e) {
        console.error('[TelegramQueue] task error:', e)
      }
      await sleep(50)
    }
    this.processing = false
  }
}

const telegramQueue = new TelegramQueue()

async function sendMessageWithRetry(
  chatId: string,
  message: TelegramMessage,
  retries = 3
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await telegramCall<unknown>('sendMessage', {
        chat_id: chatId,
        text: message.text,
        ...message.options,
      })
      return
    } catch (err: any) {
      if (err?.message?.includes('429')) {
        const retryAfter = parseInt(String(err?.message?.match(/\d+/)?.[0] ?? '5'), 10)
        await sleep(retryAfter * 1000)
      } else if (err?.message?.includes('403')) {
        // User blocked the bot — log and give up
        console.warn(`[telegram] Bot blocked by chat ${chatId}`)
        return
      } else if (i < retries - 1) {
        await sleep(Math.pow(2, i) * 1000)
      }
    }
  }
}

export function sendMessage(chatId: string, message: TelegramMessage): void {
  telegramQueue.add(() => sendMessageWithRetry(chatId, message))
}
```

- [ ] **Step 4: Запустить тесты — убедиться что проходят**

```bash
cd backend && pnpm test tests/unit/telegram-bot-send.test.ts 2>&1 | tail -10
```

Expected: PASS, 9 tests

- [ ] **Step 5: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/payment/services/telegram-bot.ts backend/tests/unit/telegram-bot-send.test.ts
git commit -m "feat(sprint7): add sendMessage, TelegramQueue, buildNotificationMessage to telegram-bot"
```

---

## Task 3: sendNotification Service

**Files:**

- Create: `backend/src/services/notification.service.ts`
- Test: `backend/tests/unit/notification-service.test.ts`

- [ ] **Step 1: Написать тесты**

Создать `backend/tests/unit/notification-service.test.ts`:

```typescript
import {
  buildNotificationTitle,
  buildNotificationData,
} from '../../src/services/notification.service'

describe('buildNotificationTitle', () => {
  it('new_application → "Новый отклик"', () => {
    expect(buildNotificationTitle('new_application')).toBe('Новый отклик')
  })

  it('offer_received → "Получен оффер"', () => {
    expect(buildNotificationTitle('offer_received')).toBe('Получен оффер')
  })

  it('subscription_expiring → "Подписка истекает"', () => {
    expect(buildNotificationTitle('subscription_expiring')).toBe('Подписка истекает')
  })

  it('vacancy_expiring_soon → "Вакансия истекает"', () => {
    expect(buildNotificationTitle('vacancy_expiring_soon')).toBe('Вакансия истекает')
  })

  it('неизвестный тип возвращает строку', () => {
    expect(typeof buildNotificationTitle('unknown')).toBe('string')
  })
})

describe('buildNotificationData', () => {
  it('new_application строит entityType=vacancy', () => {
    const d = buildNotificationData('new_application', { vacancyId: 'abc' })
    expect(d?.entityType).toBe('vacancy')
    expect(d?.entityId).toBe('abc')
  })

  it('offer_received строит entityType=application', () => {
    const d = buildNotificationData('offer_received', { applicationId: 'x1' })
    expect(d?.entityType).toBe('application')
    expect(d?.entityId).toBe('x1')
  })

  it('subscription_expiring возвращает null (нет конкретной сущности)', () => {
    expect(buildNotificationData('subscription_expiring', {})).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить — убедиться что падает**

```bash
cd backend && pnpm test tests/unit/notification-service.test.ts 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Создать сервис**

Создать `backend/src/services/notification.service.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import {
  buildNotificationMessage,
  sendMessage,
  type NotificationType,
} from '../api/payment/services/telegram-bot'

export interface NotificationPayload {
  userId: number
  type: NotificationType
  templateData: Record<string, unknown>
}

const NOTIFICATION_TITLES: Record<string, string> = {
  new_application: 'Новый отклик',
  application_approved: 'Отклик одобрен',
  application_rejected: 'Отклик отклонён',
  interview_invitation: 'Приглашение на интервью',
  test_task: 'Тестовое задание',
  offer_received: 'Получен оффер',
  resume_viewed: 'Резюме просмотрено',
  vacancy_viewed: 'Просмотры вакансии',
  vacancy_expiring_soon: 'Вакансия истекает',
  vacancy_expired: 'Вакансия истекла',
  subscription_expiring: 'Подписка истекает',
  subscription_expired: 'Подписка истекла',
  limits_reached: 'Лимиты исчерпаны',
  saved_search_match: 'Новые результаты',
  moderation_approved: 'Публикация одобрена',
  moderation_rejected: 'Публикация отклонена',
}

export function buildNotificationTitle(type: string): string {
  return NOTIFICATION_TITLES[type] ?? 'Уведомление'
}

type NotificationData = { entityType: string; entityId: string | number } | null

export function buildNotificationData(
  type: string,
  templateData: Record<string, unknown>
): NotificationData {
  const map: Record<string, NotificationData> = {}

  if (
    templateData['vacancyId'] &&
    ['new_application', 'vacancy_expiring_soon', 'vacancy_expired', 'vacancy_viewed'].includes(type)
  ) {
    return { entityType: 'vacancy', entityId: templateData['vacancyId'] as string }
  }
  if (
    templateData['applicationId'] &&
    [
      'application_approved',
      'application_rejected',
      'interview_invitation',
      'test_task',
      'offer_received',
    ].includes(type)
  ) {
    return { entityType: 'application', entityId: templateData['applicationId'] as string }
  }
  if (
    templateData['resumeId'] &&
    ['resume_viewed', 'moderation_approved', 'moderation_rejected'].includes(type)
  ) {
    return { entityType: 'resume', entityId: templateData['resumeId'] as string }
  }

  return map[type] ?? null
}

export async function sendNotification(
  strapi: Core.Strapi,
  payload: NotificationPayload
): Promise<void> {
  const { userId, type, templateData } = payload
  const message = buildNotificationMessage(type, templateData)

  // 1. Save to DB
  try {
    await (strapi.documents as any)('api::notification.notification').create({
      data: {
        user: userId,
        type,
        title: buildNotificationTitle(type),
        body: message.text,
        isRead: false,
        data: buildNotificationData(type, templateData),
      },
    })
  } catch (err) {
    strapi.log.error(
      `[notification] Failed to save notification type=${type} userId=${userId}`,
      err
    )
  }

  // 2. Send Telegram message if user has telegramId
  try {
    const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      select: ['telegramId'],
    })) as { telegramId?: string | null } | null

    if (user?.telegramId) {
      sendMessage(user.telegramId, message)
    }
  } catch (err) {
    strapi.log.error(`[notification] Failed to send Telegram message userId=${userId}`, err)
  }
}
```

- [ ] **Step 4: Запустить тесты — убедиться что проходят**

```bash
cd backend && pnpm test tests/unit/notification-service.test.ts 2>&1 | tail -10
```

Expected: PASS, 8 tests

- [ ] **Step 5: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/notification.service.ts backend/tests/unit/notification-service.test.ts
git commit -m "feat(sprint7): add sendNotification service"
```

---

## Task 4: Notification API Endpoints

**Files:**

- Create: `backend/src/api/notification/controllers/notification.ts`
- Create: `backend/src/api/notification/routes/notification.ts`

- [ ] **Step 1: Создать контроллер**

Создать `backend/src/api/notification/controllers/notification.ts`:

```typescript
import type { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { isRead, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters: Record<string, unknown> = { user: { id: { $eq: user.id } } }
    if (isRead === 'true') filters['isRead'] = { $eq: true }
    if (isRead === 'false') filters['isRead'] = { $eq: false }

    const [notifications, total] = await Promise.all([
      (strapi.documents as any)('api::notification.notification').findMany({
        filters,
        fields: ['documentId', 'type', 'title', 'body', 'isRead', 'data', 'createdAt'],
        sort: 'createdAt:desc',
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
      }),
      (strapi.documents as any)('api::notification.notification').count({ filters }),
    ])

    ctx.send({
      data: notifications,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async markRead(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }

    const notification = await (strapi.documents as any)('api::notification.notification').findOne({
      documentId: id,
      populate: { user: { fields: ['id'] } },
    })

    if (!notification) return ctx.notFound('Notification not found')
    if (notification.user?.id !== user.id) return ctx.forbidden('Not your notification')

    const updated = await (strapi.documents as any)('api::notification.notification').update({
      documentId: id,
      data: { isRead: true },
      fields: ['documentId', 'isRead'],
    })

    ctx.send({ data: updated })
  },

  async markAllRead(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    await strapi.db.query('api::notification.notification').updateMany({
      where: { user: { id: user.id }, isRead: false },
      data: { isRead: true },
    })

    ctx.send({ ok: true })
  },
})
```

- [ ] **Step 2: Создать routes**

Создать `backend/src/api/notification/routes/notification.ts`:

```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/notifications',
      handler: 'notification.findMine',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
    {
      method: 'POST',
      path: '/notifications/read-all',
      handler: 'notification.markAllRead',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
    {
      method: 'PATCH',
      path: '/notifications/:id/read',
      handler: 'notification.markRead',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
  ],
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/notification/controllers/notification.ts backend/src/api/notification/routes/notification.ts
git commit -m "feat(sprint7): add GET /notifications, PATCH /:id/read, POST /read-all endpoints"
```

---

## Task 5: Telegram Bot Command Handler

**Files:**

- Modify: `backend/src/api/payment/controllers/telegram-webhook.ts`
- Test: `backend/tests/unit/bot-commands.test.ts`

- [ ] **Step 1: Написать тесты**

Создать `backend/tests/unit/bot-commands.test.ts`:

```typescript
import {
  parseCommand,
  buildProfileText,
  buildHelpText,
} from '../../src/api/payment/services/bot-commands'

describe('parseCommand', () => {
  it('парсит /start', () => {
    expect(parseCommand('/start')).toEqual({ command: 'start', args: '' })
  })

  it('парсит /start с payload', () => {
    expect(parseCommand('/start vacancy_123')).toEqual({ command: 'start', args: 'vacancy_123' })
  })

  it('парсит /profile', () => {
    expect(parseCommand('/profile')).toEqual({ command: 'profile', args: '' })
  })

  it('не-команда возвращает null', () => {
    expect(parseCommand('hello')).toBeNull()
  })

  it('пустая строка возвращает null', () => {
    expect(parseCommand('')).toBeNull()
  })
})

describe('buildHelpText', () => {
  it('содержит список команд', () => {
    const text = buildHelpText()
    expect(text).toContain('/profile')
    expect(text).toContain('/notifications')
    expect(text).toContain('/subscribe')
  })
})

describe('buildProfileText', () => {
  it('содержит план пользователя', () => {
    const text = buildProfileText({ subscriptionPlan: 'pro', vacancyCredits: 5, applyCredits: 10 })
    expect(text).toContain('pro')
    expect(text).toContain('5')
    expect(text).toContain('10')
  })
})
```

- [ ] **Step 2: Запустить — убедиться что падает**

```bash
cd backend && pnpm test tests/unit/bot-commands.test.ts 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Создать bot-commands.ts**

Создать `backend/src/api/payment/services/bot-commands.ts`:

```typescript
import { sendMessage, type TelegramMessage } from './telegram-bot'

export interface ParsedCommand {
  command: string
  args: string
}

export function parseCommand(text: string): ParsedCommand | null {
  if (!text.startsWith('/')) return null
  const [rawCommand = '', ...rest] = text.split(' ')
  const command = rawCommand.slice(1).split('@')[0]!
  return { command, args: rest.join(' ') }
}

export function buildHelpText(): string {
  return (
    '<b>GramJob Bot — команды:</b>\n\n' +
    '/profile — профиль и кредиты\n' +
    '/notifications — последние 5 уведомлений\n' +
    '/vacancies — поиск вакансий\n' +
    '/resume — мои резюме\n' +
    '/subscribe — планы и подписка\n' +
    '/help — эта справка'
  )
}

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'GramJobBot'

function appLink(startapp: string): string {
  return `https://t.me/${BOT_USERNAME}/app?startapp=${startapp}`
}

export function buildProfileText(user: {
  subscriptionPlan: string
  vacancyCredits: number
  applyCredits: number
}): string {
  return (
    `<b>Ваш профиль GramJob</b>\n\n` +
    `📋 План: <b>${user.subscriptionPlan}</b>\n` +
    `💼 Кредиты вакансий: ${user.vacancyCredits}\n` +
    `📨 Кредиты откликов: ${user.applyCredits}`
  )
}

export function buildStartMessage(): TelegramMessage {
  return {
    text: '👋 Добро пожаловать в <b>GramJob</b> — международная биржа вакансий!\n\nОткройте приложение для поиска работы или размещения вакансий.',
    options: {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 Открыть GramJob', url: appLink('home') }]],
      },
    },
  }
}

export async function handleBotCommand(strapi: any, chatId: string, text: string): Promise<void> {
  const parsed = parseCommand(text)
  if (!parsed) return

  const { command } = parsed

  if (command === 'start' || command === 'help') {
    if (command === 'start') {
      sendMessage(chatId, buildStartMessage())
    } else {
      sendMessage(chatId, { text: buildHelpText(), options: { parse_mode: 'HTML' } })
    }
    return
  }

  // Look up user by telegramId for authenticated commands
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { telegramId: chatId },
    select: ['id', 'subscriptionPlan', 'vacancyCredits', 'applyCredits'],
  })

  if (!user) {
    sendMessage(chatId, {
      text: 'Аккаунт не найден. Зайдите в GramJob чтобы авторизоваться.',
      options: {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '🔑 Войти', url: appLink('home') }]] },
      },
    })
    return
  }

  if (command === 'profile') {
    sendMessage(chatId, {
      text: buildProfileText(user),
      options: {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '⚙️ Открыть профиль', url: appLink('profile') }]],
        },
      },
    })
  } else if (command === 'notifications') {
    const notifications = await (strapi.documents as any)(
      'api::notification.notification'
    ).findMany({
      filters: { user: { id: { $eq: user.id } }, isRead: { $eq: false } },
      fields: ['title', 'body', 'createdAt'],
      sort: 'createdAt:desc',
      limit: 5,
    })

    if (notifications.length === 0) {
      sendMessage(chatId, {
        text: 'Нет непрочитанных уведомлений.',
        options: { parse_mode: 'HTML' },
      })
    } else {
      const lines = notifications.map((n: any) => `• <b>${n.title}</b>: ${n.body}`).join('\n\n')
      sendMessage(chatId, {
        text: `<b>Последние уведомления:</b>\n\n${lines}`,
        options: {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '📋 Все уведомления', url: appLink('notifications') }]],
          },
        },
      })
    }
  } else if (command === 'vacancies') {
    sendMessage(chatId, {
      text: 'Ищите вакансии в приложении GramJob:',
      options: {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '🔍 Искать вакансии', url: appLink('vacancies') }]],
        },
      },
    })
  } else if (command === 'resume') {
    sendMessage(chatId, {
      text: 'Управляйте резюме в приложении:',
      options: {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '📄 Мои резюме', url: appLink('resumes') }]] },
      },
    })
  } else if (command === 'subscribe') {
    sendMessage(chatId, {
      text: 'Выберите план подписки:',
      options: {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '💳 Планы подписки', url: appLink('subscription') }]],
        },
      },
    })
  }
}
```

- [ ] **Step 4: Подключить handleBotCommand в telegram-webhook.ts**

В `backend/src/api/payment/controllers/telegram-webhook.ts` добавить импорт и обработку команд:

```typescript
// В начало файла добавить импорт:
import { handleBotCommand } from '../services/bot-commands'

// Обновить тип TelegramUpdate:
type TelegramUpdate = {
  update_id: number
  pre_checkout_query?: PreCheckoutQuery
  message?: {
    from?: TelegramUser
    chat?: { id: number }
    text?: string
    successful_payment?: SuccessfulPayment
  }
}

// В handle() после проверки pre_checkout_query добавить:
// (в теле функции handle, перед строкой ctx.status = 200)
if (update.message?.text?.startsWith('/')) {
  const chatId = String(update.message.chat?.id ?? update.message.from?.id ?? '')
  if (chatId) {
    await handleBotCommand(strapi, chatId, update.message.text)
  }
}
```

Полный блок проверок в `handle()` должен выглядеть так:

```typescript
async handle(ctx: any) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret) {
    const incoming = ctx.request.headers['x-telegram-bot-api-secret-token']
    if (incoming !== secret) {
      ctx.status = 403
      ctx.body = { ok: false }
      return
    }
  }

  const update = ctx.request.body as TelegramUpdate

  if (update.pre_checkout_query) {
    await handlePreCheckout(update.pre_checkout_query)
  } else if (update.message?.successful_payment) {
    await handleSuccessfulPayment(strapi, update.message.successful_payment)
  } else if (update.message?.text?.startsWith('/')) {
    const chatId = String(update.message.chat?.id ?? update.message.from?.id ?? '')
    if (chatId) {
      await handleBotCommand(strapi, chatId, update.message.text)
    }
  }

  ctx.status = 200
  ctx.body = { ok: true }
},
```

- [ ] **Step 5: Запустить тесты**

```bash
cd backend && pnpm test tests/unit/bot-commands.test.ts 2>&1 | tail -10
```

Expected: PASS, 8 tests

- [ ] **Step 6: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add backend/src/api/payment/services/bot-commands.ts backend/src/api/payment/controllers/telegram-webhook.ts backend/tests/unit/bot-commands.test.ts
git commit -m "feat(sprint7): add Telegram bot command handler (/start /help /profile /notifications etc)"
```

---

## Task 6: Application Lifecycle Hooks → sendNotification

**Files:**

- Modify: `backend/src/api/application/content-types/application/lifecycles.ts`

- [ ] **Step 1: Обновить lifecycles.ts**

Заменить содержимое `backend/src/api/application/content-types/application/lifecycles.ts`:

```typescript
import { sendNotification } from '../../../../services/notification.service'
import { APPLICATION_STATUS_TO_NOTIFICATION } from '../../../payment/services/telegram-bot'
import type { Core } from '@strapi/strapi'

type ApplicationAfterEvent = {
  result: {
    id?: number
    documentId?: string
    status?: string
    vacancy?: { id?: number; documentId?: string }
    user?: { id?: number }
  }
  params: unknown
}

export default {
  async afterCreate(event: ApplicationAfterEvent) {
    const s = globalThis.strapi as Core.Strapi
    s.log.info(`[application] New application ${event.result.documentId} created`)

    try {
      // Fetch application with relations to get vacancy.postedBy
      const application = await (s.documents as any)('api::application.application').findOne({
        documentId: event.result.documentId!,
        populate: {
          vacancy: { fields: ['documentId', 'title'], populate: { postedBy: { fields: ['id'] } } },
          user: { fields: ['id', 'firstName', 'lastName'] },
          resume: { fields: ['id'] },
        },
      })

      if (!application) return

      const employerId = application.vacancy?.postedBy?.id
      const candidateName =
        [application.user?.firstName, application.user?.lastName].filter(Boolean).join(' ') ||
        'Кандидат'

      if (employerId) {
        await sendNotification(s, {
          userId: employerId,
          type: 'new_application',
          templateData: {
            vacancyTitle: application.vacancy?.title ?? '',
            vacancyId: application.vacancy?.documentId ?? '',
            candidateName,
          },
        })
      }
    } catch (err) {
      s.log.error('[application] Failed to send new_application notification', err)
    }
  },

  async afterUpdate(event: ApplicationAfterEvent) {
    const s = globalThis.strapi as Core.Strapi
    const newStatus = event.result.status

    s.log.info(`[application] Application ${event.result.documentId} status → ${newStatus}`)

    const notificationType = APPLICATION_STATUS_TO_NOTIFICATION[newStatus ?? '']
    if (!notificationType) return

    try {
      const application = await (s.documents as any)('api::application.application').findOne({
        documentId: event.result.documentId!,
        populate: {
          vacancy: { fields: ['documentId', 'title'] },
          user: { fields: ['id'] },
        },
      })

      if (!application?.user?.id) return

      await sendNotification(s, {
        userId: application.user.id,
        type: notificationType,
        templateData: {
          vacancyTitle: application.vacancy?.title ?? '',
          applicationId: event.result.documentId ?? '',
        },
      })
    } catch (err) {
      s.log.error('[application] Failed to send status-change notification', err)
    }
  },
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/application/content-types/application/lifecycles.ts
git commit -m "feat(sprint7): wire application lifecycle hooks to sendNotification"
```

---

## Task 7: Resume и Company Lifecycle Hooks → sendNotification

**Files:**

- Modify: `backend/src/api/resume/content-types/resume/lifecycles.ts`
- Modify: `backend/src/api/company/content-types/company/lifecycles.ts`

- [ ] **Step 1: Обновить resume/lifecycles.ts**

Заменить содержимое `backend/src/api/resume/content-types/resume/lifecycles.ts`:

```typescript
import { sendNotification } from '../../../../services/notification.service'
import type { Core } from '@strapi/strapi'

type ResumeAfterEvent = {
  result: { documentId?: string; status?: string; title?: string }
  params: unknown
}

export default {
  async afterUpdate(event: ResumeAfterEvent) {
    const s = globalThis.strapi as Core.Strapi

    if (event.result.status !== 'published') return

    s.log.info(`[resume] Resume ${event.result.documentId} published`)

    try {
      const resume = await (s.documents as any)('api::resume.resume').findOne({
        documentId: event.result.documentId!,
        populate: { user: { fields: ['id'] } },
        fields: ['documentId', 'title'],
      })

      if (!resume?.user?.id) return

      await sendNotification(s, {
        userId: resume.user.id,
        type: 'moderation_approved',
        templateData: {
          title: resume.title ?? '',
          entityType: 'resume',
          entityId: event.result.documentId ?? '',
          resumeId: event.result.documentId ?? '',
        },
      })
    } catch (err) {
      s.log.error('[resume] Failed to send moderation_approved notification', err)
    }
  },
}
```

- [ ] **Step 2: Обновить company/lifecycles.ts**

Заменить содержимое `backend/src/api/company/content-types/company/lifecycles.ts`:

```typescript
import { sendNotification } from '../../../../services/notification.service'
import type { Core } from '@strapi/strapi'

type CompanyLifecycleEvent = {
  result: {
    status?: string
    documentId?: string
    name?: string
  }
  params: unknown
}

export default {
  async afterUpdate(event: CompanyLifecycleEvent) {
    if (event.result.status !== 'published') return

    const s = globalThis.strapi as Core.Strapi
    s.log.info(`[company] Company ${event.result.documentId} published`)

    try {
      const company = await (s.documents as any)('api::company.company').findOne({
        documentId: event.result.documentId!,
        populate: { owner: { fields: ['id'] } },
        fields: ['documentId', 'name'],
      })

      if (!company?.owner?.id) return

      await sendNotification(s, {
        userId: company.owner.id,
        type: 'moderation_approved',
        templateData: {
          title: company.name ?? '',
          entityType: 'company',
          entityId: event.result.documentId ?? '',
        },
      })
    } catch (err) {
      s.log.error('[company] Failed to send moderation_approved notification', err)
    }
  },
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/resume/content-types/resume/lifecycles.ts backend/src/api/company/content-types/company/lifecycles.ts
git commit -m "feat(sprint7): wire resume and company lifecycle hooks to sendNotification"
```

---

## Task 8: Cron — Подключить уведомления к существующим задачам

**Files:**

- Modify: `backend/config/cron-tasks.ts`

Обновить все четыре существующие cron-задачи, заменив TODO-комментарии реальными вызовами sendNotification. Также добавить проверку вакансий, истекающих через 3 дня, в задачу 09:00.

- [ ] **Step 1: Обновить hourly cron (vacancy expiry)**

Заменить блок `'0 * * * *'` в `config/cron-tasks.ts`:

```typescript
'0 * * * *': {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    try {
      const now = new Date().toISOString()

      const expired = await strapi.documents('api::vacancy.vacancy').findMany({
        filters: {
          status: { $eq: 'published' },
          expiresAt: { $lt: now },
        },
        fields: ['documentId', 'title'],
        populate: { postedBy: { fields: ['id'] } },
        limit: 1000,
      })

      if (expired.length === 0) return

      strapi.log.info(`[cron] Expiring ${expired.length} vacancies`)

      for (const vacancy of expired) {
        await strapi.documents('api::vacancy.vacancy').update({
          documentId: vacancy.documentId,
          data: { status: 'expired' },
        })

        const posterId = (vacancy as any).postedBy?.id
        if (posterId) {
          await sendNotification(strapi, {
            userId: posterId,
            type: 'vacancy_expired',
            templateData: {
              vacancyTitle: vacancy.title ?? '',
              vacancyId: vacancy.documentId ?? '',
            },
          })
        }
      }
    } catch (err) {
      strapi.log.error('[cron] Failed to expire vacancies', err)
    }
  },
  options: { tz: 'UTC' },
},
```

- [ ] **Step 2: Обновить saved search cron**

Заменить блок `'0 */2 * * *'` — внутри `if (newCount > 0)` заменить TODO на:

```typescript
if (newCount > 0) {
  strapi.log.info(
    `[cron] SavedSearch ${search.documentId}: ${newCount} new ${search.type}(s) for user ${search.user?.id}`
  )

  if (search.user?.id) {
    await sendNotification(strapi, {
      userId: search.user.id,
      type: 'saved_search_match',
      templateData: {
        count: newCount,
        searchType: search.type,
      },
    })
  }

  await (strapi.documents as any)('api::saved-search.saved-search').update({
    documentId: search.documentId,
    data: { lastNotifiedAt: new Date().toISOString() },
  })
}
```

- [ ] **Step 3: Обновить subscription expiry cron (02:00 UTC)**

Внутри блока `for (const user of expiredUsers)` в `'0 2 * * *'` заменить TODO на:

```typescript
strapi.log.info(`[cron] User ${user.id} plan=${user.subscriptionPlan} → free (expired)`)

await sendNotification(strapi, {
  userId: user.id,
  type: 'subscription_expired',
  templateData: { plan: user.subscriptionPlan },
})
```

- [ ] **Step 4: Обновить 7-day expiry warning cron (09:00 UTC) и добавить vacancy_expiring_soon**

Заменить полный блок `'0 9 * * *'`:

```typescript
'0 9 * * *': {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    try {
      // 1. Subscription 7-day warning
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)

      const expiringUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
        where: {
          subscriptionPlan: { $notIn: ['free'] },
          subscriptionExpiresAt: {
            $gt: sixDaysFromNow.toISOString(),
            $lte: sevenDaysFromNow.toISOString(),
          },
        },
        select: ['id', 'subscriptionPlan'],
        limit: 1000,
      })

      strapi.log.info(`[cron] ${expiringUsers.length} subscriptions expiring in 7 days`)

      for (const user of expiringUsers) {
        await sendNotification(strapi, {
          userId: user.id,
          type: 'subscription_expiring',
          templateData: { plan: user.subscriptionPlan },
        })
      }

      // 2. Vacancy expiring in 3 days
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

      const expiringSoonVacancies = await strapi.documents('api::vacancy.vacancy').findMany({
        filters: {
          status: { $eq: 'published' },
          expiresAt: {
            $gt: twoDaysFromNow.toISOString(),
            $lte: threeDaysFromNow.toISOString(),
          },
        },
        fields: ['documentId', 'title'],
        populate: { postedBy: { fields: ['id'] } },
        limit: 1000,
      })

      strapi.log.info(`[cron] ${expiringSoonVacancies.length} vacancies expiring in 3 days`)

      for (const vacancy of expiringSoonVacancies) {
        const posterId = (vacancy as any).postedBy?.id
        if (posterId) {
          await sendNotification(strapi, {
            userId: posterId,
            type: 'vacancy_expiring_soon',
            templateData: {
              vacancyTitle: vacancy.title ?? '',
              vacancyId: vacancy.documentId ?? '',
            },
          })
        }
      }
    } catch (err) {
      strapi.log.error('[cron] Failed to process daily 09:00 notifications', err)
    }
  },
  options: { tz: 'UTC' },
},
```

- [ ] **Step 5: Добавить импорт sendNotification в начало cron-tasks.ts**

В самый верх файла `backend/config/cron-tasks.ts` добавить:

```typescript
import { sendNotification } from '../src/services/notification.service'
```

- [ ] **Step 6: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add backend/config/cron-tasks.ts
git commit -m "feat(sprint7): wire sendNotification into existing cron tasks"
```

---

## Task 9: Новые Cron-задачи (Digest + Cleanup)

**Files:**

- Modify: `backend/config/cron-tasks.ts`

- [ ] **Step 1: Добавить daily views digest (18:00 UTC)**

В `config/cron-tasks.ts` добавить новую cron-задачу после `'0 9 * * *'`:

```typescript
// Daily 18:00 UTC: vacancy views digest (vacancies with ≥5 views yesterday)
'0 18 * * *': {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    try {
      const yesterday = new Date()
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      const yesterdayDate = yesterday.toISOString().slice(0, 10)

      const records = await strapi.db
        .query('api::vacancy-analytics.vacancy-analytics')
        .findMany({
          where: { date: yesterdayDate, views: { $gte: 5 } },
          populate: {
            vacancy: {
              select: ['id', 'documentId', 'title'],
              populate: { postedBy: { select: ['id'] } },
            },
          },
          limit: 1000,
        }) as Array<{
          views: number
          vacancy?: { documentId?: string; title?: string; postedBy?: { id?: number } }
        }>

      strapi.log.info(`[cron] ${records.length} vacancies with ≥5 views yesterday`)

      for (const record of records) {
        const posterId = record.vacancy?.postedBy?.id
        if (posterId) {
          await sendNotification(strapi, {
            userId: posterId,
            type: 'vacancy_viewed',
            templateData: {
              vacancyTitle: record.vacancy?.title ?? '',
              vacancyId: record.vacancy?.documentId ?? '',
              views: record.views,
            },
          })
        }
      }
    } catch (err) {
      strapi.log.error('[cron] Failed to send vacancy views digest', err)
    }
  },
  options: { tz: 'UTC' },
},

// Weekly Sunday 00:00 UTC: delete read notifications older than 30 days
'0 0 * * 0': {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const deleted = await strapi.db.query('api::notification.notification').deleteMany({
        where: {
          isRead: true,
          createdAt: { $lt: thirtyDaysAgo },
        },
      })

      strapi.log.info(`[cron] Deleted ${(deleted as any)?.count ?? 0} old read notifications`)
    } catch (err) {
      strapi.log.error('[cron] Failed to cleanup notifications', err)
    }
  },
  options: { tz: 'UTC' },
},
```

- [ ] **Step 2: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Полный тест-прогон**

```bash
cd backend && pnpm test 2>&1 | tail -15
```

Expected: все тесты PASS

- [ ] **Step 4: Commit**

```bash
git add backend/config/cron-tasks.ts
git commit -m "feat(sprint7): add views digest (18:00 UTC) and notification cleanup (weekly) crons"
```

---

## Task 10: VacancyAnalytics и ResumeAnalytics Schemas

**Files:**

- Create: `backend/src/api/vacancy-analytics/content-types/vacancy-analytics/schema.json`
- Create: `backend/src/api/resume-analytics/content-types/resume-analytics/schema.json`

- [ ] **Step 1: Создать VacancyAnalytics schema**

```json
{
  "kind": "collectionType",
  "collectionName": "vacancy_analytics",
  "info": {
    "singularName": "vacancy-analytics",
    "pluralName": "vacancy-analytics",
    "displayName": "VacancyAnalytics",
    "description": "Daily analytics snapshot per vacancy"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "vacancy": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::vacancy.vacancy"
    },
    "date": {
      "type": "date",
      "required": true
    },
    "views": {
      "type": "integer",
      "default": 0
    },
    "uniqueViews": {
      "type": "integer",
      "default": 0
    },
    "applications": {
      "type": "integer",
      "default": 0
    },
    "ctr": {
      "type": "float",
      "default": 0
    }
  }
}
```

- [ ] **Step 2: Создать ResumeAnalytics schema**

```json
{
  "kind": "collectionType",
  "collectionName": "resume_analytics",
  "info": {
    "singularName": "resume-analytics",
    "pluralName": "resume-analytics",
    "displayName": "ResumeAnalytics",
    "description": "Daily analytics snapshot per resume"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "resume": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::resume.resume"
    },
    "date": {
      "type": "date",
      "required": true
    },
    "views": {
      "type": "integer",
      "default": 0
    },
    "uniqueViews": {
      "type": "integer",
      "default": 0
    },
    "invitations": {
      "type": "integer",
      "default": 0
    }
  }
}
```

- [ ] **Step 3: Проверить JSON**

```bash
cat backend/src/api/vacancy-analytics/content-types/vacancy-analytics/schema.json | python3 -m json.tool > /dev/null && echo "OK"
cat backend/src/api/resume-analytics/content-types/resume-analytics/schema.json | python3 -m json.tool > /dev/null && echo "OK"
```

Expected: два `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/vacancy-analytics/ backend/src/api/resume-analytics/
git commit -m "feat(sprint7): add VacancyAnalytics and ResumeAnalytics content type schemas"
```

---

## Task 11: Analytics Aggregation Cron (01:00 UTC)

**Files:**

- Modify: `backend/config/cron-tasks.ts`
- Test: `backend/tests/unit/analytics-cron.test.ts`

Логика: для каждой active vacancy — считаем сумму всех имеющихся VacancyAnalytics.views (prevTotal), delta = vacancy.views - prevTotal, если delta > 0 — создаём запись за вчерашнюю дату.

- [ ] **Step 1: Написать тест для хелпера**

Создать `backend/tests/unit/analytics-cron.test.ts`:

```typescript
import { computeDelta, yesterdayUTC } from '../../src/services/analytics.service'

describe('computeDelta', () => {
  it('возвращает разницу', () => {
    expect(computeDelta(150, 130)).toBe(20)
  })

  it('возвращает 0 если дельта отрицательная (не бывает в норме)', () => {
    expect(computeDelta(100, 150)).toBe(0)
  })

  it('возвращает 0 если нет предыдущей суммы', () => {
    expect(computeDelta(50, 0)).toBe(50)
  })
})

describe('yesterdayUTC', () => {
  it('возвращает строку в формате YYYY-MM-DD', () => {
    const result = yesterdayUTC()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('возвращает вчерашнюю дату', () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = yesterdayUTC()
    expect(yesterday < today).toBe(true)
  })
})
```

- [ ] **Step 2: Создать analytics.service.ts**

Создать `backend/src/services/analytics.service.ts`:

```typescript
export function computeDelta(current: number, prevTotal: number): number {
  return Math.max(0, current - prevTotal)
}

export function yesterdayUTC(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 3: Запустить тесты**

```bash
cd backend && pnpm test tests/unit/analytics-cron.test.ts 2>&1 | tail -10
```

Expected: PASS, 5 tests

- [ ] **Step 4: Добавить analytics cron в cron-tasks.ts**

Добавить импорт в начало `config/cron-tasks.ts`:

```typescript
import { computeDelta, yesterdayUTC } from '../src/services/analytics.service'
```

Добавить новую задачу:

```typescript
// Daily 01:00 UTC: aggregate analytics for yesterday
'0 1 * * *': {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    const date = yesterdayUTC()
    strapi.log.info(`[cron] Aggregating analytics for ${date}`)

    try {
      // --- Vacancy Analytics ---
      const vacancies = await strapi.documents('api::vacancy.vacancy').findMany({
        filters: { status: { $in: ['published', 'expired', 'archived'] } },
        fields: ['documentId', 'views', 'uniqueViews', 'applicationsCount'],
        limit: 10000,
      }) as Array<{
        documentId: string
        views: number
        uniqueViews: number
        applicationsCount: number
      }>

      for (const vacancy of vacancies) {
        try {
          // Sum all existing daily records to get previous total
          const existing = await strapi.db
            .query('api::vacancy-analytics.vacancy-analytics')
            .findMany({
              where: { vacancy: { documentId: vacancy.documentId } },
              select: ['views', 'uniqueViews', 'applications'],
            }) as Array<{ views: number; uniqueViews: number; applications: number }>

          const prevViews = existing.reduce((s, r) => s + (r.views ?? 0), 0)
          const prevUnique = existing.reduce((s, r) => s + (r.uniqueViews ?? 0), 0)
          const prevApps = existing.reduce((s, r) => s + (r.applications ?? 0), 0)

          const deltaViews = computeDelta(vacancy.views ?? 0, prevViews)
          const deltaUnique = computeDelta(vacancy.uniqueViews ?? 0, prevUnique)
          const deltaApps = computeDelta(vacancy.applicationsCount ?? 0, prevApps)

          if (deltaViews === 0 && deltaUnique === 0 && deltaApps === 0) continue

          const ctr =
            deltaUnique > 0
              ? Math.round((deltaApps / deltaUnique) * 100 * 10) / 10
              : 0

          await strapi.db.query('api::vacancy-analytics.vacancy-analytics').create({
            data: {
              vacancy: { documentId: vacancy.documentId },
              date,
              views: deltaViews,
              uniqueViews: deltaUnique,
              applications: deltaApps,
              ctr,
            },
          })
        } catch (e) {
          strapi.log.warn(`[cron] analytics failed for vacancy ${vacancy.documentId}`, e)
        }
      }

      // --- Resume Analytics ---
      const resumes = await strapi.documents('api::resume.resume').findMany({
        filters: { status: { $in: ['published', 'archived'] } },
        fields: ['documentId', 'views', 'invitations'],
        limit: 10000,
      }) as Array<{ documentId: string; views: number; invitations: number }>

      for (const resume of resumes) {
        try {
          const existing = await strapi.db
            .query('api::resume-analytics.resume-analytics')
            .findMany({
              where: { resume: { documentId: resume.documentId } },
              select: ['views', 'invitations'],
            }) as Array<{ views: number; invitations: number }>

          const prevViews = existing.reduce((s, r) => s + (r.views ?? 0), 0)
          const prevInv = existing.reduce((s, r) => s + (r.invitations ?? 0), 0)

          const deltaViews = computeDelta(resume.views ?? 0, prevViews)
          const deltaInv = computeDelta(resume.invitations ?? 0, prevInv)

          if (deltaViews === 0 && deltaInv === 0) continue

          const deltaUnique = deltaViews // Resumes don't track unique separately on MVP

          await strapi.db.query('api::resume-analytics.resume-analytics').create({
            data: {
              resume: { documentId: resume.documentId },
              date,
              views: deltaViews,
              uniqueViews: deltaUnique,
              invitations: deltaInv,
            },
          })
        } catch (e) {
          strapi.log.warn(`[cron] analytics failed for resume ${resume.documentId}`, e)
        }
      }

      strapi.log.info(`[cron] Analytics aggregation done: ${vacancies.length} vacancies, ${resumes.length} resumes`)
    } catch (err) {
      strapi.log.error('[cron] Analytics aggregation failed', err)
    }
  },
  options: { tz: 'UTC' },
},
```

- [ ] **Step 5: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add backend/config/cron-tasks.ts backend/src/services/analytics.service.ts backend/tests/unit/analytics-cron.test.ts
git commit -m "feat(sprint7): add daily analytics aggregation cron (01:00 UTC)"
```

---

## Task 12: Analytics API Endpoints

**Files:**

- Create: `backend/src/api/analytics/controllers/analytics.ts`
- Create: `backend/src/api/analytics/routes/analytics.ts`

- [ ] **Step 1: Создать контроллер**

Создать `backend/src/api/analytics/controllers/analytics.ts`:

```typescript
import type { Core } from '@strapi/strapi'

function clampDate(input: string | undefined, fallbackDaysAgo: number): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - fallbackDaysAgo)
  return d.toISOString().slice(0, 10)
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async vacancyAnalytics(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const { from, to } = ctx.query as Record<string, string>

    const fromDate = clampDate(from, 30)
    const toDate = clampDate(to, 0)

    // Verify ownership
    const vacancy = await (strapi.documents as any)('api::vacancy.vacancy').findOne({
      documentId: id,
      populate: { postedBy: { fields: ['id'] } },
      fields: ['documentId', 'title'],
    })

    if (!vacancy) return ctx.notFound('Vacancy not found')
    if ((vacancy as any).postedBy?.id !== user.id) return ctx.forbidden('Not your vacancy')

    const records = (await strapi.db.query('api::vacancy-analytics.vacancy-analytics').findMany({
      where: {
        vacancy: { documentId: id },
        date: { $gte: fromDate, $lte: toDate },
      },
      orderBy: { date: 'asc' },
      select: ['date', 'views', 'uniqueViews', 'applications', 'ctr'],
    })) as Array<{
      date: string
      views: number
      uniqueViews: number
      applications: number
      ctr: number
    }>

    const total = {
      views: records.reduce((s, r) => s + r.views, 0),
      uniqueViews: records.reduce((s, r) => s + r.uniqueViews, 0),
      applications: records.reduce((s, r) => s + r.applications, 0),
      ctr:
        records.reduce((s, r) => s + r.uniqueViews, 0) > 0
          ? Math.round(
              (records.reduce((s, r) => s + r.applications, 0) /
                records.reduce((s, r) => s + r.uniqueViews, 0)) *
                100 *
                10
            ) / 10
          : 0,
    }

    ctx.send({ total, daily: records })
  },

  async resumeAnalytics(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const { from, to } = ctx.query as Record<string, string>

    const fromDate = clampDate(from, 30)
    const toDate = clampDate(to, 0)

    const resume = await (strapi.documents as any)('api::resume.resume').findOne({
      documentId: id,
      populate: { user: { fields: ['id'] } },
      fields: ['documentId', 'title'],
    })

    if (!resume) return ctx.notFound('Resume not found')
    if ((resume as any).user?.id !== user.id) return ctx.forbidden('Not your resume')

    const records = (await strapi.db.query('api::resume-analytics.resume-analytics').findMany({
      where: {
        resume: { documentId: id },
        date: { $gte: fromDate, $lte: toDate },
      },
      orderBy: { date: 'asc' },
      select: ['date', 'views', 'uniqueViews', 'invitations'],
    })) as Array<{ date: string; views: number; uniqueViews: number; invitations: number }>

    const total = {
      views: records.reduce((s, r) => s + r.views, 0),
      uniqueViews: records.reduce((s, r) => s + r.uniqueViews, 0),
      invitations: records.reduce((s, r) => s + r.invitations, 0),
    }

    ctx.send({ total, daily: records })
  },
})
```

- [ ] **Step 2: Создать routes**

Создать `backend/src/api/analytics/routes/analytics.ts`:

```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/analytics/vacancies/:id',
      handler: 'analytics.vacancyAnalytics',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
    {
      method: 'GET',
      path: '/analytics/resumes/:id',
      handler: 'analytics.resumeAnalytics',
      config: { middlewares: ['plugin::users-permissions.isAuthenticated'] },
    },
  ],
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd backend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Полный тест-прогон**

```bash
cd backend && pnpm test 2>&1 | tail -15
```

Expected: все тесты PASS (≥ 212 тестов)

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/analytics/
git commit -m "feat(sprint7): add GET /analytics/vacancies/:id and GET /analytics/resumes/:id"
```

---

## Self-Review

### Spec Coverage

| Требование из sprint-plan.md                      | Task      |
| ------------------------------------------------- | --------- |
| Content type: Notification                        | Task 1    |
| sendNotification(userId, type, data)              | Task 3    |
| Bot commands /start /help /profile /notifications | Task 5    |
| Lifecycle hooks → sendNotification                | Task 6, 7 |
| GET /notifications                                | Task 4    |
| PATCH /notifications/:id/read                     | Task 4    |
| POST /notifications/read-all                      | Task 4    |
| Content type: VacancyAnalytics                    | Task 10   |
| Content type: ResumeAnalytics                     | Task 10   |
| Cron 01:00 UTC: агрегация аналитики               | Task 11   |
| GET /analytics/vacancies/:id                      | Task 12   |
| GET /analytics/resumes/:id                        | Task 12   |
| SavedSearch cron → уведомление                    | Task 8    |
| subscription_expiring cron → уведомление          | Task 8    |
| vacancy_expiring_soon cron                        | Task 8    |
| vacancy_expired cron                              | Task 8    |
| Views digest cron 18:00 UTC                       | Task 9    |
| Cleanup cron (weekly)                             | Task 9    |

**Не покрыто в этом плане (Sprint 8):** moderation_rejected lifecycle hook (реализуется через Strapi Admin actions в Sprint 8).

### Placeholder Scan

Нет TBD / TODO / "fill in details" в коде.

### Type Consistency

- `NotificationType` экспортируется из `telegram-bot.ts`, используется в `notification.service.ts`, lifecycle hooks и cron-tasks.ts — консистентно.
- `sendNotification(strapi, payload)` — сигнатура одинакова во всех Task 6, 7, 8, 9.
- `APPLICATION_STATUS_TO_NOTIFICATION` — экспортируется из `telegram-bot.ts`, импортируется в `application/lifecycles.ts`.
- `computeDelta`, `yesterdayUTC` — экспортируются из `analytics.service.ts`, используются в `cron-tasks.ts` и тестах.
