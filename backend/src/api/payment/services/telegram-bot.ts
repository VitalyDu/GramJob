export type InvoicePayload =
  | { type: 'subscription'; planCode: string; userId: number }
  | { type: 'vacancy_pack'; packageId: number; userId: number }
  | { type: 'apply_pack'; packageId: number; userId: number }
  | { type: 'urgent'; vacancyDocumentId: string; userId: number }
  | { type: 'top_placement'; vacancyDocumentId: string; userId: number }

// Одноразовые апгрейды вакансии — фиксированные цены в Stars.
export const URGENT_PRICE_STARS = 99
export const TOP_PLACEMENT_PRICE_STARS = 199

export function buildTelegramApiUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`
}

export function buildInvoicePayload(data: InvoicePayload): string {
  return JSON.stringify(data)
}

export function parseInvoicePayload(raw: string): InvoicePayload {
  const parsed = JSON.parse(raw) as InvoicePayload
  if (!parsed.type || !parsed.userId) {
    throw new Error('Invalid invoice payload: missing type or userId')
  }
  return parsed
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  return token
}

async function telegramCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const url = buildTelegramApiUrl(getBotToken(), method)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const json = (await res.json()) as {
    ok: boolean
    result: T
    error_code?: number
    description?: string
  }
  if (!json.ok) {
    // error_code is included so retry logic can match on 429/403
    throw new Error(
      `Telegram API error [${method}] ${json.error_code ?? res.status}: ${json.description ?? 'unknown error'}`
    )
  }
  return json.result
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function createInvoiceLink(params: {
  title: string
  description: string
  payload: InvoicePayload
  starsAmount: number
}): Promise<string> {
  return telegramCall<string>('createInvoiceLink', {
    title: params.title,
    description: params.description,
    payload: buildInvoicePayload(params.payload),
    currency: 'XTR',
    prices: [{ label: params.title, amount: params.starsAmount }],
  })
}

export async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  await telegramCall<boolean>('answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  })
}

export async function setWebhook(url: string, secretToken?: string): Promise<void> {
  await telegramCall<boolean>('setWebhook', {
    url,
    ...(secretToken ? { secret_token: secretToken } : {}),
    allowed_updates: ['message', 'pre_checkout_query'],
  })
}

export type NotificationType =
  | 'new_application'
  | 'application_in_review'
  | 'application_approved'
  | 'application_rejected'
  | 'interview_invitation'
  | 'test_task'
  | 'offer_received'
  | 'resume_viewed'
  | 'invitation_to_apply'
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
  // in-review = «работодатель изучает» — не то же самое, что одобрено.
  // application_approved зарезервирован под будущее раскрытие контактов на interview.
  'in-review': 'application_in_review',
  rejected: 'application_rejected',
  interview: 'interview_invitation',
  'test-task': 'test_task',
  offer: 'offer_received',
}

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'gramjob_bot'

function buildDeepLink(type: string, data: Record<string, unknown>): string | null {
  if (
    data['vacancyId'] &&
    ['new_application', 'vacancy_expiring_soon', 'vacancy_expired', 'vacancy_viewed'].includes(type)
  ) {
    return `vacancy_${data['vacancyId']}`
  }
  if (
    data['applicationId'] &&
    [
      'application_in_review',
      'application_approved',
      'application_rejected',
      'interview_invitation',
      'test_task',
      'offer_received',
    ].includes(type)
  ) {
    return `application_${data['applicationId']}`
  }
  if (data['vacancyId'] && type === 'invitation_to_apply') {
    return `vacancy_${data['vacancyId']}`
  }
  if (['subscription_expiring', 'subscription_expired', 'limits_reached'].includes(type)) {
    return 'subscription'
  }
  if (type === 'saved_search_match') {
    return data['searchType'] === 'resume' ? 'resumes' : 'vacancies'
  }
  if (data['entityId'] && ['moderation_approved', 'moderation_rejected'].includes(type)) {
    return `${data['entityType']}_${data['entityId']}`
  }
  if (data['resumeId'] && type === 'resume_viewed') {
    return `resume_${data['resumeId']}`
  }
  return null
}

const BUTTON_TEXTS: Partial<Record<NotificationType, string>> = {
  new_application: '👤 Посмотреть отклик',
  application_in_review: '📋 Открыть отклик',
  application_approved: '✅ Открыть контакты',
  offer_received: '🎉 Посмотреть оффер',
  resume_viewed: '👁 Открыть резюме',
  invitation_to_apply: '📨 Открыть вакансию',
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
    application_in_review: `📋 Ваш отклик на «${data['vacancyTitle'] ?? ''}» изучают`,
    application_approved: `✅ Ваш отклик на «${data['vacancyTitle'] ?? ''}» одобрен! Теперь доступны контакты работодателя`,
    application_rejected: `❌ Отклик на «${data['vacancyTitle'] ?? ''}» отклонён`,
    interview_invitation: `📅 Вас приглашают на интервью по вакансии «${data['vacancyTitle'] ?? ''}»`,
    test_task: `📝 Вам отправили тестовое задание по вакансии «${data['vacancyTitle'] ?? ''}»`,
    offer_received: `🎉 Вам сделали оффер по вакансии «${data['vacancyTitle'] ?? ''}»!`,
    resume_viewed: `👁 Ваше резюме «${data['resumeTitle'] ?? ''}» просмотрел работодатель`,
    invitation_to_apply: `📨 Работодатель ${data['companyName'] ?? ''} приглашает вас откликнуться на вакансию «${data['vacancyTitle'] ?? ''}»`,
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

  // No parse_mode: templates are plain text with user-provided values (titles, names).
  // HTML mode would break delivery (or allow markup injection) on titles containing < & >.
  return {
    text,
    options:
      deepLink && buttonText
        ? {
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
        : {},
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
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('429')) {
        await sleep(5000)
      } else if (msg.includes('403')) {
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
