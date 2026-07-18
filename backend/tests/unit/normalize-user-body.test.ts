import { stripNullStringFieldsFromBody } from '../../src/extensions/users-permissions/normalize-user-body'

describe('stripNullStringFieldsFromBody', () => {
  it('удаляет email/username/password, если они null', () => {
    const body: Record<string, unknown> = {
      email: null,
      username: null,
      password: null,
      firstName: 'Vitaly',
    }
    stripNullStringFieldsFromBody(body)
    expect(body).toEqual({ firstName: 'Vitaly' })
  })

  it('не трогает валидные значения', () => {
    const body: Record<string, unknown> = {
      email: 'user@example.com',
      username: 'someone',
      password: 'secret',
      firstName: 'Vitaly',
    }
    stripNullStringFieldsFromBody(body)
    expect(body).toEqual({
      email: 'user@example.com',
      username: 'someone',
      password: 'secret',
      firstName: 'Vitaly',
    })
  })

  it('не трогает пустые строки (пусть валидатор с ними разбирается)', () => {
    const body: Record<string, unknown> = { email: '', username: '' }
    stripNullStringFieldsFromBody(body)
    expect(body).toEqual({ email: '', username: '' })
  })

  it('не удаляет undefined-поля, если ключ отсутствует', () => {
    const body: Record<string, unknown> = { firstName: 'X' }
    stripNullStringFieldsFromBody(body)
    expect(body).toEqual({ firstName: 'X' })
    expect('email' in body).toBe(false)
  })

  it('удаляет только null-и, микс-кейсы', () => {
    const body: Record<string, unknown> = {
      email: null,
      username: 'tg_123',
      password: null,
    }
    stripNullStringFieldsFromBody(body)
    expect(body).toEqual({ username: 'tg_123' })
  })

  it('не падает на null / примитивах / undefined', () => {
    expect(() => stripNullStringFieldsFromBody(null)).not.toThrow()
    expect(() => stripNullStringFieldsFromBody(undefined)).not.toThrow()
    expect(() => stripNullStringFieldsFromBody('string')).not.toThrow()
    expect(() => stripNullStringFieldsFromBody(42)).not.toThrow()
  })

  it('не удаляет посторонние null-поля (только email/username/password)', () => {
    const body: Record<string, unknown> = {
      email: null,
      customField: null,
      firstName: 'X',
    }
    stripNullStringFieldsFromBody(body)
    expect(body).toEqual({ customField: null, firstName: 'X' })
  })
})
