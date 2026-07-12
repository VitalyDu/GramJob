# GramJob — Notification System

---

## Архитектура

Уведомления работают в два слоя:

1. **In-app notifications** — хранятся в таблице `Notification`, отображаются в UI
2. **Telegram push** — отправляются через Bot API (`sendMessage`)

Оба создаются одновременно одним вызовом `sendNotification()`.

Telegram push отправляется только если у пользователя есть `telegramId` **и** включён тумблер `telegramNotificationsEnabled` (настройки профиля; проверка `!== false` в `notification.service`). In-app уведомление создаётся всегда.

Отдельный канал — **уведомления администраторам** (`admin-notify.ts`): при попадании новой сущности в очередь модерации отправляется Telegram-сообщение на chat id из env `ADMIN_TELEGRAM_CHAT_IDS` (список через запятую). В БД не сохраняется.

---

## Сервис sendNotification

```typescript
// backend/src/services/notification.service.ts

interface NotificationPayload {
  userId: number
  type: NotificationType
  title: string // Для in-app
  body: string // Для in-app + Telegram текст
  data?: {
    // Deep link data
    entityType: string
    entityId: number | string
  }
}

async function sendNotification(payload: NotificationPayload): Promise<void> {
  // 1. Сохранить в БД
  await strapi.documents('api::notification.notification').create({
    data: {
      user: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      isRead: false,
      data: payload.data,
    },
  })

  // 2. Отправить в Telegram (если есть telegramId)
  const user = await strapi
    .documents('plugin::users-permissions.user')
    .findOne({ documentId: payload.userId })

  if (user.telegramId) {
    await sendTelegramMessage(user.telegramId, payload)
  }
}
```

---

## Telegram Rate Limits

Telegram Bot API ограничения:

- **30 сообщений/сек** — глобальный лимит бота
- **1 сообщение/сек** в один чат
- При превышении: HTTP 429, `retry_after` в ответе

**Стратегия:**

- Все уведомления проходят через очередь (простая реализация — массив с setTimeout)
- Для v1: простая задержка 50ms между отправками (≤ 20 msg/sec, безопасный лимит)
- Для scale: Redis + Bull queue

```typescript
// Простая очередь для v1
class TelegramQueue {
  private queue: Array<() => Promise<void>> = []
  private processing = false

  add(fn: () => Promise<void>) {
    this.queue.push(fn)
    if (!this.processing) this.process()
  }

  private async process() {
    this.processing = true
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      try {
        await task()
      } catch (e) {
        console.error(e)
      }
      await sleep(50) // 20 msg/sec
    }
    this.processing = false
  }
}

const telegramQueue = new TelegramQueue()
```

---

## Retry логика

При ошибке отправки в Telegram:

| Код ошибки           | Действие                                                    |
| -------------------- | ----------------------------------------------------------- |
| 429 (flood)          | Ждать `retry_after` секунд, повторить                       |
| 403 (bot blocked)    | Очистить `User.telegramId` (пользователь заблокировал бота) |
| 400 (chat not found) | Логировать, не повторять                                    |
| 5xx                  | Повторить 3 раза с экспоненциальной задержкой               |

```typescript
async function sendWithRetry(chatId: string, message: TelegramMessage, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await bot.sendMessage(chatId, message.text, message.options)
      return
    } catch (err) {
      if (err.code === 429) {
        await sleep(err.parameters.retry_after * 1000)
      } else if (err.code === 403) {
        await clearTelegramId(chatId)
        return
      } else if (i < retries - 1) {
        await sleep(Math.pow(2, i) * 1000)
      }
    }
  }
}
```

---

## Типы уведомлений и шаблоны

### Для кандидата

| type                    | title (RU)              | Telegram-текст                                                     |
| ----------------------- | ----------------------- | ------------------------------------------------------------------ |
| `resume_viewed`         | Резюме просмотрено      | «Ваше резюме «{resumeTitle}» просмотрел работодатель»              |
| `application_approved`  | Отклик одобрен          | «Ваш отклик на «{vacancyTitle}» одобрен! Теперь доступны контакты» |
| `application_rejected`  | Отклик отклонён         | «Отклик на «{vacancyTitle}» отклонён»                              |
| `interview_invitation`  | Приглашение на интервью | «Вас приглашают на интервью по вакансии «{vacancyTitle}»»          |
| `test_task`             | Тестовое задание        | «Вам отправили тестовое задание по вакансии «{vacancyTitle}»»      |
| `offer_received`        | Получен оффер           | «🎉 Вам сделали оффер по вакансии «{vacancyTitle}»!»               |
| `subscription_expiring` | Подписка истекает       | «Ваша подписка {plan} истекает через 7 дней»                       |
| `moderation_approved`   | Публикация одобрена     | «Ваше резюме/вакансия «{title}» опубликована»                      |
| `moderation_rejected`   | Публикация отклонена    | «Вакансия/Резюме «{title}» отклонена. Причина: {reason}»           |

Тип `saved_search_match` остался в enum как legacy (модуль сохранённых поисков удалён), новые уведомления этого типа не создаются.

### Для работодателя

| type                    | title (RU)         | Telegram-текст                                                   |
| ----------------------- | ------------------ | ---------------------------------------------------------------- |
| `new_application`       | Новый отклик       | «Новый отклик на «{vacancyTitle}» от {candidateName}»            |
| `vacancy_viewed`        | Просмотры вакансии | (дайджест — 1 раз/день) «Вакансию «{title}» просмотрели {N} раз» |
| `subscription_expiring` | Подписка истекает  | «Подписка {plan} истекает через 7 дней»                          |
| `limits_reached`        | Лимиты исчерпаны   | «Исчерпан лимит {limitType}. Рассмотрите апгрейд»                |
| `vacancy_expiring_soon` | Вакансия истекает  | «Вакансия «{title}» истекает через 3 дня»                        |

---

## Telegram-сообщение с кнопкой

```typescript
function buildNotificationMessage(type: string, data: any): TelegramMessage {
  const text = buildText(type, data)
  const deepLink = buildDeepLink(data)

  return {
    text,
    options: {
      parse_mode: 'HTML',
      reply_markup: deepLink
        ? {
            inline_keyboard: [
              [
                {
                  text: getButtonText(type),
                  url: `https://t.me/${BOT_USERNAME}/app?startapp=${deepLink}`,
                },
              ],
            ],
          }
        : undefined,
    },
  }
}

function getButtonText(type: string): string {
  const map: Record<string, string> = {
    new_application: '👤 Посмотреть отклик',
    application_approved: '✅ Открыть контакты',
    offer_received: '🎉 Посмотреть оффер',
    subscription_expiring: '💳 Продлить подписку',
  }
  return map[type] || '📋 Открыть'
}
```

---

## Дайджест (batch-уведомления)

Некоторые события объединяются в одно сообщение, чтобы не спамить:

- **VacancyViewed** — отправляется раз в день (cron 18:00 UTC), если было ≥ 5 просмотров за вчерашний день

---

## In-app Notification Center

- Хранятся в `Notification` content type
- Пагинация: последние 50 (достаточно для v1)
- Автоочистка: удалять прочитанные старше 30 дней (cron)
- Badge в навигации: `GET /notifications?isRead=false&pageSize=1` → показывает ●

---

## Cron-задачи уведомлений

| Задача                                                 | Расписание                         |
| ------------------------------------------------------ | ---------------------------------- |
| Vacancy expiry (published → expired)                   | Каждый час                         |
| Subscription expiry (откат на Free + isVip=false)      | Ежедневно 02:00 UTC                |
| Subscription expiry warning (за 7 дней)                | Ежедневно 09:00 UTC                |
| Vacancy expiring soon (за 3 дня)                       | Ежедневно 09:00 UTC                |
| Daily vacancy views digest (≥5 просмотров)             | Ежедневно 18:00 UTC                |
| Clean old notifications (прочитанные > 30 дн)          | Еженедельно, воскресенье 00:00 UTC |
| Аналитика (агрегация VacancyAnalytics/ResumeAnalytics) | Ежедневно 01:00 UTC                |
