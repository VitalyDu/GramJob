import crypto from 'crypto'

const MAX_AGE_SECONDS = 86400 // 24 hours

/**
 * Validates Telegram Mini App initData string.
 * Returns parsed params if valid, null if invalid or expired.
 *
 * Algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  botToken: string
): Record<string, string> | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  params.delete('hash')

  const sortedString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'))) {
    return null
  }

  const authDate = parseInt(params.get('auth_date') ?? '0', 10)
  if (Math.floor(Date.now() / 1000) - authDate > MAX_AGE_SECONDS) return null

  return Object.fromEntries(params.entries())
}

/**
 * Validates Telegram Login Widget data object.
 *
 * Algorithm: https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateWebWidget(telegramData: Record<string, string>, botToken: string): boolean {
  const { hash, ...data } = telegramData
  if (!hash) return false

  const sortedString = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}

export type TelegramUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

/**
 * Parses the `user` JSON field from validated initData params.
 */
export function parseInitData(params: Record<string, string>): TelegramUser {
  const user = JSON.parse(params.user ?? '{}') as Record<string, unknown>
  return {
    id: parseInt(String(user.id), 10),
    first_name: String(user.first_name ?? ''),
    last_name: user.last_name ? String(user.last_name) : undefined,
    username: user.username ? String(user.username) : undefined,
    photo_url: user.photo_url ? String(user.photo_url) : undefined,
    language_code: user.language_code ? String(user.language_code) : undefined,
  }
}
