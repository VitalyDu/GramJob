export interface User {
  id: number
  email: string
  telegramId: string | null
  firstName: string
  lastName: string
  avatar: string | null
  language: 'ru' | 'en'
  subscriptionPlan: 'free' | 'pro' | 'max' | 'vip'
  subscriptionExpiresAt: string | null
  vacancyCredits: number
  applyCredits: number
  createdAt: string
}

export interface AuthResponse {
  jwt: string
  user: User
}

export interface TelegramWidgetUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface TelegramAuthPayload {
  initData?: string
  telegramData?: TelegramWidgetUser
}

export interface StrapiMeta {
  pagination?: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

export interface StrapiListResponse<T> {
  data: T[]
  meta: StrapiMeta
}

export interface StrapiError {
  status: number
  name: string
  message: string
  details?: unknown
}
