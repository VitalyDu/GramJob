import crypto from 'crypto'
import {
  validateInitData,
  validateWebWidget,
  parseInitData,
} from '../../src/api/telegram-auth/services/telegram-validation'

const BOT_TOKEN = 'test_bot_token_12345'

function makeInitData(userId: number, authDateOverride?: number): string {
  const user = JSON.stringify({ id: userId, first_name: 'Test', last_name: 'User' })
  const authDate = authDateOverride ?? Math.floor(Date.now() / 1000)

  const params = new URLSearchParams({ user, auth_date: String(authDate) })

  const sortedString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')

  params.set('hash', hash)
  return params.toString()
}

function makeWebWidgetData(userId: number): Record<string, string> {
  const authDate = Math.floor(Date.now() / 1000)
  const data: Record<string, string> = {
    id: String(userId),
    first_name: 'Test',
    auth_date: String(authDate),
  }

  const sortedString = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest()
  data.hash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')

  return data
}

describe('validateInitData (Mini App)', () => {
  it('returns parsed params for valid initData', () => {
    const initData = makeInitData(123456)
    const result = validateInitData(initData, BOT_TOKEN)
    expect(result).not.toBeNull()
    expect(result?.auth_date).toBeDefined()
  })

  it('returns null for tampered initData', () => {
    const initData = makeInitData(123456)
    const tampered = initData + '&extra=malicious'
    expect(validateInitData(tampered, BOT_TOKEN)).toBeNull()
  })

  it('returns null when hash is missing', () => {
    const params = new URLSearchParams({
      user: '{}',
      auth_date: String(Math.floor(Date.now() / 1000)),
    })
    expect(validateInitData(params.toString(), BOT_TOKEN)).toBeNull()
  })

  it('returns null when auth_date is older than 24 hours', () => {
    const oldDate = Math.floor(Date.now() / 1000) - 90000 // 25 hours ago
    const initData = makeInitData(123456, oldDate)
    expect(validateInitData(initData, BOT_TOKEN)).toBeNull()
  })
})

describe('validateWebWidget', () => {
  it('returns true for valid Telegram Login Widget data', () => {
    const data = makeWebWidgetData(123456)
    expect(validateWebWidget(data, BOT_TOKEN)).toBe(true)
  })

  it('returns false for tampered data', () => {
    const data = makeWebWidgetData(123456)
    data.first_name = 'Hacker'
    expect(validateWebWidget(data, BOT_TOKEN)).toBe(false)
  })

  it('returns false when hash is missing', () => {
    expect(validateWebWidget({ id: '1', first_name: 'A', auth_date: '1' }, BOT_TOKEN)).toBe(false)
  })
})

describe('parseInitData', () => {
  it('extracts user object from initData params', () => {
    const initData = makeInitData(999)
    const params = Object.fromEntries(new URLSearchParams(initData).entries())
    const result = parseInitData(params)
    expect(result.id).toBe(999)
    expect(result.first_name).toBe('Test')
  })

  it('returns optional fields as undefined when absent', () => {
    const params = { user: JSON.stringify({ id: 1, first_name: 'A' }) }
    const result = parseInitData(params)
    expect(result.last_name).toBeUndefined()
    expect(result.username).toBeUndefined()
  })
})
