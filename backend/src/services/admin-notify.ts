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
