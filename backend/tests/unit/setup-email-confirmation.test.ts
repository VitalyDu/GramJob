import { configureEmailConfirmation } from '../../src/scripts/setup-email-confirmation'

function makeStrapi(initialByKey: Record<string, unknown>) {
  const set = jest.fn().mockResolvedValue(undefined)
  const get = jest.fn(async ({ key }: { key: string }) => initialByKey[key] ?? null)
  const strapi = {
    store: jest.fn().mockReturnValue({ get, set }),
    log: { info: jest.fn(), warn: jest.fn() },
  }
  return { strapi, set }
}

describe('configureEmailConfirmation', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      FRONTEND_URL: 'http://localhost:3000',
      EMAIL_FROM: 'noreply@gramjob.com',
      EMAIL_FROM_NAME: 'GramJob',
    }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('включает email_confirmation и сохраняет URL редиректа', async () => {
    const { strapi, set } = makeStrapi({ advanced: {} })
    await configureEmailConfirmation(strapi as never)
    const advancedCall = set.mock.calls.find(([arg]) => arg.key === 'advanced')
    expect(advancedCall?.[0].value).toMatchObject({
      email_confirmation: true,
      email_confirmation_redirection: 'http://localhost:3000/email-confirmed',
    })
  })

  it('перезаписывает from email на EMAIL_FROM в шаблонах', async () => {
    const { strapi, set } = makeStrapi({
      advanced: {
        email_confirmation: true,
        email_confirmation_redirection: 'http://localhost:3000/email-confirmed',
      },
      email: {
        reset_password: {
          options: {
            from: { name: 'Administration Panel', email: 'no-reply@strapi.io' },
            object: 'Reset password',
          },
        },
        email_confirmation: {
          options: {
            from: { name: 'Administration Panel', email: 'no-reply@strapi.io' },
            object: 'Account confirmation',
          },
        },
      },
    })
    await configureEmailConfirmation(strapi as never)
    const emailCall = set.mock.calls.find(([arg]) => arg.key === 'email')
    expect(emailCall?.[0].value.reset_password.options.from).toEqual({
      name: 'GramJob',
      email: 'noreply@gramjob.com',
    })
    expect(emailCall?.[0].value.email_confirmation.options.from).toEqual({
      name: 'GramJob',
      email: 'noreply@gramjob.com',
    })
    // Существующие поля (object) не должны стереться
    expect(emailCall?.[0].value.reset_password.options.object).toBe('Reset password')
  })

  it('idempotent: не перезаписывает если from уже соответствует env', async () => {
    const { strapi, set } = makeStrapi({
      advanced: {
        email_confirmation: true,
        email_confirmation_redirection: 'http://localhost:3000/email-confirmed',
      },
      email: {
        reset_password: { options: { from: { name: 'GramJob', email: 'noreply@gramjob.com' } } },
        email_confirmation: {
          options: { from: { name: 'GramJob', email: 'noreply@gramjob.com' } },
        },
      },
    })
    await configureEmailConfirmation(strapi as never)
    const emailCall = set.mock.calls.find(([arg]) => arg.key === 'email')
    expect(emailCall).toBeUndefined()
  })

  it('warn и выход, если FRONTEND_URL не задан', async () => {
    delete process.env.FRONTEND_URL
    const { strapi, set } = makeStrapi({})
    await configureEmailConfirmation(strapi as never)
    expect(set).not.toHaveBeenCalled()
    expect(strapi.log.warn).toHaveBeenCalled()
  })
})
