import { configurePasswordReset } from '../../src/scripts/setup-password-reset'

function makeStrapi(advanced: Record<string, unknown> | null) {
  const set = jest.fn()
  const get = jest.fn().mockResolvedValue(advanced)
  const strapi = {
    store: jest.fn().mockReturnValue({ get, set }),
    log: { info: jest.fn(), warn: jest.fn() },
  }
  return { strapi, set }
}

describe('configurePasswordReset', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV, FRONTEND_URL: 'http://localhost:3000' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('устанавливает email_reset_password из FRONTEND_URL, сохраняя остальные настройки', async () => {
    const { strapi, set } = makeStrapi({ email_confirmation: false })
    await configurePasswordReset(strapi as never)
    expect(set).toHaveBeenCalledWith({
      key: 'advanced',
      value: {
        email_confirmation: false,
        email_reset_password: 'http://localhost:3000/reset-password',
      },
    })
  })

  it('idempotent: не пишет, если URL уже установлен', async () => {
    const { strapi, set } = makeStrapi({
      email_reset_password: 'http://localhost:3000/reset-password',
    })
    await configurePasswordReset(strapi as never)
    expect(set).not.toHaveBeenCalled()
  })

  it('срезает завершающий слэш FRONTEND_URL', async () => {
    process.env.FRONTEND_URL = 'https://gramjob.com/'
    const { strapi, set } = makeStrapi({})
    await configurePasswordReset(strapi as never)
    expect(set).toHaveBeenCalledWith({
      key: 'advanced',
      value: { email_reset_password: 'https://gramjob.com/reset-password' },
    })
  })

  it('warn и выход, если FRONTEND_URL не задан', async () => {
    delete process.env.FRONTEND_URL
    const { strapi, set } = makeStrapi({})
    await configurePasswordReset(strapi as never)
    expect(set).not.toHaveBeenCalled()
    expect(strapi.log.warn).toHaveBeenCalled()
  })

  it('работает при отсутствии сохранённых advanced settings (null)', async () => {
    const { strapi, set } = makeStrapi(null)
    await configurePasswordReset(strapi as never)
    expect(set).toHaveBeenCalledWith({
      key: 'advanced',
      value: { email_reset_password: 'http://localhost:3000/reset-password' },
    })
  })
})
