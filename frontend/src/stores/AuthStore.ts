import { makeAutoObservable, runInAction } from 'mobx'
import type { User, AuthResponse, TelegramAuthPayload } from '@/types/api'
import { api, setAuthToken, ApiClientError } from '@/services/api'

const JWT_KEY = 'gramjob_jwt'

export class AuthStore {
  user: User | null = null
  jwt: string | null = null
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
    this._syncToken()
  }

  get isAuthenticated(): boolean {
    return this.jwt !== null && this.user !== null
  }

  // Reads JWT from localStorage synchronously so API calls made in child useEffect
  // hooks don't fire without auth (child effects run before parent StoreProvider effect)
  private _syncToken(): void {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(JWT_KEY)
    if (!stored) return
    this.jwt = stored
    setAuthToken(stored)
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(JWT_KEY)
    if (!stored) return
    this.jwt = stored
    setAuthToken(stored)
    await this.fetchMe()
  }

  async loginWithEmail(identifier: string, password: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<AuthResponse>('/auth/local', { identifier, password })
      this._setSession(res.jwt, res.user)
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Login failed'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async registerWithEmail(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<AuthResponse>('/auth/local/register', {
        email,
        password,
        firstName,
        lastName,
      })
      this._setSession(res.jwt, res.user)
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Registration failed'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async loginWithTelegram(payload: TelegramAuthPayload): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<AuthResponse>('/auth/telegram', payload)
      this._setSession(res.jwt, res.user)
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Telegram auth failed'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMe(): Promise<void> {
    try {
      const user = await api.get<User>('/users/me')
      runInAction(() => {
        this.user = user
      })
    } catch (e) {
      // Only an invalid/expired token warrants a logout — network errors and
      // 5xx must not destroy the session on a flaky connection
      if (e instanceof ApiClientError && (e.status === 401 || e.status === 403)) {
        this.logout()
      }
    }
  }

  logout(): void {
    runInAction(() => {
      this.jwt = null
      this.user = null
    })
    setAuthToken(null)
    if (typeof window !== 'undefined') localStorage.removeItem(JWT_KEY)
  }

  private _setSession(jwt: string, user: User): void {
    runInAction(() => {
      this.jwt = jwt
      this.user = user
    })
    setAuthToken(jwt)
    if (typeof window !== 'undefined') localStorage.setItem(JWT_KEY, jwt)
  }
}
