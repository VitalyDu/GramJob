const TELEGRAM_HOSTS = ['t.me', 'telegram.org', 'telegram-cdn.org']
const UPLOADS_PREFIX = '/uploads/'

export function isAllowedAvatarUrl(value: unknown): boolean {
  if (value === null || value === '') return true
  if (typeof value !== 'string') return false

  if (isSafeRelativeUploadPath(value)) return true

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false

  const allowedHosts = [...TELEGRAM_HOSTS]
  for (const envKey of ['S3_PUBLIC_URL', 'PUBLIC_UPLOADS_URL'] as const) {
    const envVal = process.env[envKey]
    if (!envVal) continue
    try {
      allowedHosts.push(new URL(envVal).hostname)
    } catch {
      // некорректный env — просто не добавляем хост
    }
  }

  return allowedHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
}

function isSafeRelativeUploadPath(value: string): boolean {
  if (!value.startsWith(UPLOADS_PREFIX)) return false
  if (value.length === UPLOADS_PREFIX.length) return false
  // Reject anything that could escape via traversal, protocol-relative tricks, or backslashes
  if (value.includes('..')) return false
  if (value.includes('\\')) return false
  if (value.startsWith('//')) return false
  return true
}
