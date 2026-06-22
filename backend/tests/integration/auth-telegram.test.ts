import request from 'supertest'
import crypto from 'crypto'
import { setupStrapi, teardownStrapi } from '../helpers/strapi'
import type { Core } from '@strapi/strapi'

let strapi: Core.Strapi

const BOT_TOKEN = 'test_bot_token_12345'

function makeValidInitData(userId: number): string {
  const user = JSON.stringify({
    id: userId,
    first_name: 'Иван',
    last_name: 'Тестовый',
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

describe('POST /api/auth/telegram', () => {
  it('creates a new user and returns JWT when given valid initData', async () => {
    const userId = 111222333
    const initData = makeValidInitData(userId)

    const res = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('jwt')
    expect(typeof res.body.jwt).toBe('string')
    expect(res.body.user).toMatchObject({
      telegramId: String(userId),
      firstName: 'Иван',
      subscriptionPlan: 'free',
      vacancyCredits: 0,
      applyCredits: 0,
    })
    expect(res.body.user).not.toHaveProperty('password')
  })

  it('returns the same user on second call with same telegramId (idempotent)', async () => {
    const userId = 444555666
    const initData1 = makeValidInitData(userId)
    const initData2 = makeValidInitData(userId)

    const res1 = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData: initData1 })

    const res2 = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData: initData2 })

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(res1.body.user.id).toBe(res2.body.user.id)
  })

  it('returns 400 for invalid initData signature', async () => {
    const res = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData: `user=%7B%7D&auth_date=${Math.floor(Date.now() / 1000)}&hash=badhash` })

    expect(res.status).toBe(400)
  })

  it('returns 400 when neither initData nor telegramData provided', async () => {
    const res = await request(strapi.server.httpServer).post('/api/auth/telegram').send({})

    expect(res.status).toBe(400)
  })
})
