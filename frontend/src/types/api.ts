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

export type CompanySizeEnum =
  | 'size_1_10'
  | 'size_11_50'
  | 'size_51_200'
  | 'size_201_500'
  | 'size_500_plus'

export type CompanyStatusEnum = 'draft' | 'moderation' | 'published' | 'rejected'

export interface StrapiMedia {
  id: number
  documentId: string
  name: string
  url: string
  formats?: {
    thumbnail?: { url: string; width: number; height: number }
    small?: { url: string; width: number; height: number }
  }
  width?: number
  height?: number
}

export interface CompanyOwner {
  id: number
  firstName: string
  lastName: string
}

export interface Company {
  id: number
  documentId: string
  name: string
  slug: string
  description?: string
  website?: string
  telegram?: string
  linkedin?: string
  country: string
  city?: string
  companySize: CompanySizeEnum
  status: CompanyStatusEnum
  logo?: StrapiMedia | null
  cover?: StrapiMedia | null
  owner?: CompanyOwner | null
  createdAt: string
}

export interface CompanyListParams {
  search?: string
  country?: string
  companySize?: CompanySizeEnum
  page?: number
  pageSize?: number
}

export interface CompanyCreateInput {
  name: string
  description: string
  country: string
  companySize: CompanySizeEnum
  city?: string
  website?: string
  telegram?: string
  linkedin?: string
}

export type CompanyUpdateInput = Partial<CompanyCreateInput>
