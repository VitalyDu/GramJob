import i18n from '@/lib/i18n'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'

/** Keys of API error messages that have i18n translations under `apiErrors.*` */
const API_ERROR_I18N_KEYS: Record<string, string> = {
  Forbidden: 'apiErrors.Forbidden',
  Unauthorized: 'apiErrors.Unauthorized',
  'Not Found': 'apiErrors.Not Found',
  'Bad Request': 'apiErrors.Bad Request',
  'Internal Server Error': 'apiErrors.Internal Server Error',
  'Invalid identifier or password': 'apiErrors.Invalid identifier or password',
  'Email already taken': 'apiErrors.Email already taken',
  'Too Many Requests': 'apiErrors.Too Many Requests',
  'Incorrect code provided': 'apiErrors.Incorrect code provided',
  'Your account email is not confirmed': 'apiErrors.Your account email is not confirmed',
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  // Module-level state is shared across requests during SSR — a user's token
  // must never leak into another user's server-rendered request
  if (typeof window === 'undefined') return
  authToken = token
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const raw =
      (data as { error?: { message?: string } } | undefined)?.error?.message ?? res.statusText
    const i18nKey = API_ERROR_I18N_KEYS[raw]
    const message = i18nKey ? i18n.t(i18nKey) : raw
    throw new ApiClientError(res.status, data, message)
  }

  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export interface UploadedFile {
  id: number
  url: string
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const headers: Record<string, string> = {}
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const form = new FormData()
  form.append('files', file)

  // Без Content-Type: браузер сам выставит multipart boundary
  const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers, body: form })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const raw =
      (data as { error?: { message?: string } } | undefined)?.error?.message ?? res.statusText
    const i18nKey = API_ERROR_I18N_KEYS[raw]
    const message = i18nKey ? i18n.t(i18nKey) : raw
    throw new ApiClientError(res.status, data, message)
  }

  const files = (await res.json()) as UploadedFile[]
  const first = files[0]
  if (!first) throw new ApiClientError(500, files, 'Upload returned no files')
  return first
}
