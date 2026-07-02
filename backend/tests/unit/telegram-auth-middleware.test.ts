import crypto from 'crypto'
import createTelegramAuthMiddleware from '../../src/middlewares/telegram-auth'

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

function makeCtx(headers: Record<string, string> = {}): any {
  return { request: { headers: { ...headers } }, state: {}, status: 200, body: null }
}

describe('telegram-auth middleware — JWT injection', () => {
  const issueMock = jest.fn().mockReturnValue('fake.jwt.token')
  const findOneMock = jest.fn()

  const strapiMock = {
    db: { query: () => ({ findOne: findOneMock }) },
    plugin: () => ({ service: () => ({ issue: issueMock }) }),
  } as any

  const middleware = createTelegramAuthMiddleware({}, { strapi: strapiMock })

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
    issueMock.mockClear()
    findOneMock.mockReset()
  })

  it('без заголовка initData — passthrough, authorization не устанавливается', async () => {
    const ctx = makeCtx()
    const next = jest.fn()
    await middleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(ctx.request.headers.authorization).toBeUndefined()
  })

  it('с существующим Authorization — initData игнорируется, header не перезаписывается', async () => {
    const ctx = makeCtx({
      authorization: 'Bearer existing.jwt',
      'x-telegram-init-data': makeValidInitData(111),
    })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(ctx.request.headers.authorization).toBe('Bearer existing.jwt')
    expect(findOneMock).not.toHaveBeenCalled()
  })

  it('невалидный initData → 401, next не вызывается', async () => {
    const ctx = makeCtx({ 'x-telegram-init-data': 'user=%7B%7D&auth_date=1&hash=bad' })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('валидный initData + пользователь найден → инъекция Bearer JWT', async () => {
    findOneMock.mockResolvedValue({ id: 42, telegramId: '12345', blocked: false })
    const ctx = makeCtx({ 'x-telegram-init-data': makeValidInitData(12345) })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(findOneMock).toHaveBeenCalledWith({ where: { telegramId: '12345' } })
    expect(issueMock).toHaveBeenCalledWith({ id: 42 })
    expect(ctx.request.headers.authorization).toBe('Bearer fake.jwt.token')
    expect(next).toHaveBeenCalled()
  })

  it('пользователь не найден → 401', async () => {
    findOneMock.mockResolvedValue(null)
    const ctx = makeCtx({ 'x-telegram-init-data': makeValidInitData(99999) })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('заблокированный пользователь → 401', async () => {
    findOneMock.mockResolvedValue({ id: 42, telegramId: '12345', blocked: true })
    const ctx = makeCtx({ 'x-telegram-init-data': makeValidInitData(12345) })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('без TELEGRAM_BOT_TOKEN → 500', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    const ctx = makeCtx({ 'x-telegram-init-data': makeValidInitData(12345) })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(ctx.status).toBe(500)
    expect(next).not.toHaveBeenCalled()
  })
})
