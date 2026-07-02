import request from 'supertest'
import crypto from 'crypto'
import { setupStrapi, teardownStrapi } from '../helpers/strapi'
import type { Core } from '@strapi/strapi'

let strapi: Core.Strapi

const BOT_TOKEN = 'test_bot_token_12345'

function makeValidInitData(userId: number): string {
  const user = JSON.stringify({
    id: userId,
    first_name: 'Мини',
    last_name: 'Апп',
    language_code: 'ru',
  })
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

beforeAll(async () => {
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
  strapi = await setupStrapi()
})

afterAll(async () => {
  await teardownStrapi()
})

describe('initData auth on protected endpoints', () => {
  const telegramUserId = 777888999

  it('GET /api/users/me с X-Telegram-Init-Data (без JWT) → 200', async () => {
    // Регистрация пользователя (создаёт запись с telegramId)
    const registerRes = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData: makeValidInitData(telegramUserId) })
    expect(registerRes.status).toBe(200)

    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('X-Telegram-Init-Data', makeValidInitData(telegramUserId))

    expect(res.status).toBe(200)
    expect(res.body.telegramId).toBe(String(telegramUserId))
  })

  it('GET /api/vacancies/my с X-Telegram-Init-Data (без JWT) → 200', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/vacancies/my')
      .set('X-Telegram-Init-Data', makeValidInitData(telegramUserId))

    expect(res.status).toBe(200)
  })

  it('невалидный X-Telegram-Init-Data → 401', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('X-Telegram-Init-Data', 'user=%7B%7D&auth_date=1&hash=bad')

    expect(res.status).toBe(401)
  })

  it('initData незарегистрированного пользователя → 401', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('X-Telegram-Init-Data', makeValidInitData(555000111))

    expect(res.status).toBe(401)
  })

  it('без auth-заголовков защищённый endpoint по-прежнему закрыт', async () => {
    const res = await request(strapi.server.httpServer).get('/api/users/me')
    expect([401, 403]).toContain(res.status)
  })

  it('публичный endpoint без заголовков работает', async () => {
    const res = await request(strapi.server.httpServer).get('/api/vacancies')
    expect(res.status).toBe(200)
  })
})
