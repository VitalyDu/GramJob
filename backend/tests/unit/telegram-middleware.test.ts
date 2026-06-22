import crypto from 'crypto'

// Unit test for the validation logic that the middleware uses
// We test the validation function directly since middleware requires a full Strapi boot

const BOT_TOKEN = 'test_bot_token_12345'

function makeValidInitData(userId: number): string {
  const user = JSON.stringify({ id: userId, first_name: 'Test' })
  const authDate = Math.floor(Date.now() / 1000)
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

describe('Telegram initData middleware — validation logic', () => {
  it('accepts valid initData', async () => {
    const { validateInitData } =
      await import('../../src/api/telegram-auth/services/telegram-validation')
    const initData = makeValidInitData(12345)
    const result = validateInitData(initData, BOT_TOKEN)
    expect(result).not.toBeNull()
  })

  it('rejects invalid initData', async () => {
    const { validateInitData } =
      await import('../../src/api/telegram-auth/services/telegram-validation')
    expect(validateInitData('user=%7B%7D&auth_date=123&hash=badhash', BOT_TOKEN)).toBeNull()
  })

  it('parseInitData extracts telegramId', async () => {
    const { validateInitData, parseInitData } =
      await import('../../src/api/telegram-auth/services/telegram-validation')
    const initData = makeValidInitData(99999)
    const params = validateInitData(initData, BOT_TOKEN)
    expect(params).not.toBeNull()
    const user = parseInitData(params!)
    expect(user.id).toBe(99999)
  })
})
