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

export function stripLeadingEmoji(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}️‍]+\s*/u, '')
}

type NotificationData = { entityType: string; entityId: string | number } | null

export function buildNotificationData(
  type: string,
  templateData: Record<string, unknown>
): NotificationData {
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
  return null
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
        title: buildNotificationTitle(type, templateData),
        body: stripLeadingEmoji(message.text),
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

  // 2. Send Telegram message if user has telegramId and notifications enabled
  try {
    const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      select: ['telegramId', 'telegramNotificationsEnabled'],
    })) as { telegramId?: string | null; telegramNotificationsEnabled?: boolean | null } | null

    if (user?.telegramId && user.telegramNotificationsEnabled !== false) {
      sendMessage(user.telegramId, message)
    }
  } catch (err) {
    strapi.log.error(`[notification] Failed to send Telegram message userId=${userId}`, err)
  }
}
