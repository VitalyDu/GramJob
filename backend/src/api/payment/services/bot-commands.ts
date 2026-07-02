import { escapeHtml, sendMessage, type TelegramMessage } from './telegram-bot'

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

function buildStartMessage(): TelegramMessage {
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

  if (command === 'start') {
    sendMessage(chatId, buildStartMessage())
    return
  }

  if (command === 'help') {
    sendMessage(chatId, { text: buildHelpText(), options: { parse_mode: 'HTML' } })
    return
  }

  // Authenticated commands — look up user by telegramId
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
      const lines = (notifications as Array<{ title: string; body: string }>)
        .map((n) => `• <b>${escapeHtml(n.title)}</b>: ${escapeHtml(n.body)}`)
        .join('\n\n')
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
