import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return {
    ApiClientError: actual.ApiClientError,
    api: {
      post: vi.fn(),
      get: vi.fn(),
    },
    setAuthToken: vi.fn(),
  }
})

import { api, setAuthToken, ApiClientError } from '@/services/api'
import { AuthStore } from './AuthStore'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const mockUser = {
  id: 1,
  email: 'test@test.com',
  telegramId: null,
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  language: 'ru' as const,
  subscriptionPlan: 'free' as const,
  subscriptionExpiresAt: null,
  vacancyCredits: 3,
  applyCredits: 3,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('AuthStore', () => {
  let store: AuthStore

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    store = new AuthStore()
  })

  it('начинает без авторизации', () => {
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.jwt).toBeNull()
  })

  it('loginWithEmail устанавливает jwt и user при успехе', async () => {
    vi.mocked(api.post).mockResolvedValue({ jwt: 'test-jwt', user: mockUser })

    await store.loginWithEmail('test@test.com', 'password123')

    expect(store.jwt).toBe('test-jwt')
    expect(store.user).toEqual(mockUser)
    expect(store.isAuthenticated).toBe(true)
    expect(localStorageMock.getItem('gramjob_jwt')).toBe('test-jwt')
    expect(setAuthToken).toHaveBeenCalledWith('test-jwt')
  })

  it('loginWithEmail устанавливает error при ошибке и бросает', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Invalid credentials'))

    await expect(store.loginWithEmail('bad@test.com', 'wrong')).rejects.toThrow()

    expect(store.error).toBe('Invalid credentials')
    expect(store.isAuthenticated).toBe(false)
  })

  it('registerWithEmail сохраняет сессию при успехе', async () => {
    vi.mocked(api.post).mockResolvedValue({ jwt: 'reg-jwt', user: mockUser })

    await store.registerWithEmail('new@test.com', 'pass123', 'Ivan', 'Ivanov')

    expect(store.isAuthenticated).toBe(true)
    expect(store.jwt).toBe('reg-jwt')
  })

  it('loginWithTelegram вызывает /auth/telegram endpoint', async () => {
    vi.mocked(api.post).mockResolvedValue({ jwt: 'tg-jwt', user: mockUser })

    await store.loginWithTelegram({ initData: 'tg_init_data' })

    expect(api.post).toHaveBeenCalledWith('/auth/telegram', { initData: 'tg_init_data' })
    expect(store.isAuthenticated).toBe(true)
  })

  it('logout очищает сессию', async () => {
    vi.mocked(api.post).mockResolvedValue({ jwt: 'jwt', user: mockUser })
    await store.loginWithEmail('test@test.com', 'pass')

    store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.jwt).toBeNull()
    expect(localStorageMock.getItem('gramjob_jwt')).toBeNull()
    expect(setAuthToken).toHaveBeenLastCalledWith(null)
  })

  it('init восстанавливает сессию из localStorage', async () => {
    localStorageMock.setItem('gramjob_jwt', 'stored-jwt')
    vi.mocked(api.get).mockResolvedValue(mockUser)

    await store.init()

    expect(store.jwt).toBe('stored-jwt')
    expect(store.user).toEqual(mockUser)
    expect(setAuthToken).toHaveBeenCalledWith('stored-jwt')
  })

  it('init вызывает logout если /users/me возвращает 401', async () => {
    localStorageMock.setItem('gramjob_jwt', 'expired-jwt')
    vi.mocked(api.get).mockRejectedValue(new ApiClientError(401, {}, 'Unauthorized'))

    await store.init()

    expect(store.isAuthenticated).toBe(false)
    expect(localStorageMock.getItem('gramjob_jwt')).toBeNull()
  })

  it('init сохраняет сессию при сетевой ошибке /users/me', async () => {
    localStorageMock.setItem('gramjob_jwt', 'stored-jwt')
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    await store.init()

    expect(store.jwt).toBe('stored-jwt')
    expect(localStorageMock.getItem('gramjob_jwt')).toBe('stored-jwt')
  })

  it('init сохраняет сессию при 500 от /users/me', async () => {
    localStorageMock.setItem('gramjob_jwt', 'stored-jwt')
    vi.mocked(api.get).mockRejectedValue(new ApiClientError(500, {}, 'Internal Server Error'))

    await store.init()

    expect(store.jwt).toBe('stored-jwt')
    expect(localStorageMock.getItem('gramjob_jwt')).toBe('stored-jwt')
  })

  describe('forgotPassword', () => {
    it('вызывает POST /auth/forgot-password с email', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ ok: true })
      const store = new AuthStore()
      await store.forgotPassword('user@test.com')
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@test.com' })
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('сохраняет ошибку и пробрасывает исключение', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Too Many Requests'))
      const store = new AuthStore()
      await expect(store.forgotPassword('user@test.com')).rejects.toThrow()
      expect(store.error).toBe('Too Many Requests')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('resetPassword', () => {
    const authResponse = {
      jwt: 'new-jwt',
      user: { id: 1, email: 'user@test.com' },
    }

    it('вызывает POST /auth/reset-password и устанавливает сессию', async () => {
      vi.mocked(api.post).mockResolvedValueOnce(authResponse)
      const store = new AuthStore()
      await store.resetPassword('code123', 'newpass1', 'newpass1')
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        code: 'code123',
        password: 'newpass1',
        passwordConfirmation: 'newpass1',
      })
      expect(store.jwt).toBe('new-jwt')
      expect(store.user).toEqual(authResponse.user)
      expect(setAuthToken).toHaveBeenCalledWith('new-jwt')
      expect(localStorage.getItem('gramjob_jwt')).toBe('new-jwt')
    })

    it('сохраняет ошибку при невалидном коде и пробрасывает исключение', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(
        new ApiClientError(400, {}, 'Ссылка недействительна или устарела')
      )
      const store = new AuthStore()
      await expect(store.resetPassword('bad', 'newpass1', 'newpass1')).rejects.toThrow()
      expect(store.error).toBe('Ссылка недействительна или устарела')
      expect(store.jwt).toBeNull()
    })
  })
})
