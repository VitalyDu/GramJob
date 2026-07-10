const TELEGRAM_HOSTS = ['t.me', 'telegram.org']

export function isAllowedAvatarUrl(value: unknown): boolean {
  if (value === null || value === '') return true
  if (typeof value !== 'string') return false

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false

  const allowedHosts = [...TELEGRAM_HOSTS]
  const s3PublicUrl = process.env.S3_PUBLIC_URL
  if (s3PublicUrl) {
    try {
      allowedHosts.push(new URL(s3PublicUrl).hostname)
    } catch {
      // некорректный env — просто не добавляем хост
    }
  }

  return allowedHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
}
