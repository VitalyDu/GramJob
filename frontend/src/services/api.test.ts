import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, setAuthToken, ApiClientError } from './api'

describe('api client', () => {
  beforeEach(() => {
    setAuthToken(null)
    vi.resetAllMocks()
  })

  it('отправляет GET-запрос на правильный URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/users/me')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:1337/api/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
  })

  it('добавляет Authorization header при наличии токена', async () => {
    setAuthToken('my-jwt-token')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/users/me')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt-token',
        }),
      })
    )
  })

  it('не добавляет Authorization header без токена', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/users/me')

    const calledHeaders = fetchMock.mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined
    expect(calledHeaders?.['Authorization']).toBeUndefined()
  })

  it('бросает ApiClientError при non-ok ответе', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () =>
        Promise.resolve({ error: { message: 'Invalid token', name: 'UnauthorizedError' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get('/users/me')).rejects.toThrow(ApiClientError)
  })

  it('отправляет POST-запрос с телом', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jwt: 'token', user: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.post('/auth/local', { identifier: 'a@b.com', password: '123456' })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:1337/api/auth/local',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'a@b.com', password: '123456' }),
      })
    )
  })
})
