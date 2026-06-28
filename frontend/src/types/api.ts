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

// --- Vacancy ---

export type VacancyStatusEnum =
  | 'draft'
  | 'moderation'
  | 'published'
  | 'rejected'
  | 'expired'
  | 'archived'

export type WorkFormatEnum = 'office' | 'remote' | 'hybrid'

export type EmploymentTypeEnum = 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance'

export type SeniorityEnum = 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'principal'

export type SalaryCurrencyEnum = 'USD' | 'EUR' | 'RUB' | 'GBP'

export type SourceTypeEnum = 'internal' | 'external'

export interface IndustryRef {
  documentId: string
  slug: string
  name: { ru: string; en: string }
}

export interface SpecializationRef {
  documentId: string
  slug: string
  name: { ru: string; en: string }
}

export interface VacancyCompanyRef {
  documentId: string
  name: string
  slug: string
  logo?: StrapiMedia | null
}

export interface Vacancy {
  id: number
  documentId: string
  title: string
  country: string
  city?: string | null
  workFormat: WorkFormatEnum
  employmentType: EmploymentTypeEnum
  seniority: SeniorityEnum
  salaryFrom?: number | null
  salaryTo?: number | null
  salaryCurrency?: SalaryCurrencyEnum | null
  description?: string
  responsibilities?: string
  requirements?: string
  conditions?: string | null
  skills?: string[] | null
  languages?: string[] | null
  experienceYears?: number | null
  sourceType: SourceTypeEnum
  sourceName?: string | null
  sourceUrl?: string | null
  highlighted: boolean
  urgent: boolean
  topPlacement: boolean
  views?: number
  uniqueViews?: number
  applicationsCount?: number
  status: VacancyStatusEnum
  expiresAt?: string | null
  createdAt: string
  industry: IndustryRef
  specialization: SpecializationRef
  company: VacancyCompanyRef
}

export interface VacancyListParams {
  search?: string
  industry?: string
  specialization?: string
  country?: string
  city?: string
  workFormat?: WorkFormatEnum
  employmentType?: EmploymentTypeEnum
  seniority?: SeniorityEnum
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: SalaryCurrencyEnum
  experienceYears?: number
  skills?: string
  languages?: string
  sourceType?: SourceTypeEnum
  urgent?: boolean
  topPlacement?: boolean
  sort?: 'newest' | 'salary_asc' | 'salary_desc' | 'relevance'
  page?: number
  pageSize?: number
  status?: VacancyStatusEnum
}

export interface VacancyCreateInput {
  title: string
  industryId: string
  specializationId: string
  employmentType: EmploymentTypeEnum
  workFormat: WorkFormatEnum
  seniority: SeniorityEnum
  country: string
  city?: string
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: SalaryCurrencyEnum
  description: string
  responsibilities: string
  requirements: string
  conditions?: string
  skills?: string[]
  languages?: string[]
  experienceYears?: number
  urgent?: boolean
  companyId?: string
}

export type VacancyUpdateInput = Partial<VacancyCreateInput>

export interface Industry {
  id: number
  documentId: string
  slug: string
  name: { ru: string; en: string }
  specializations: Specialization[]
}

export interface Specialization {
  id: number
  documentId: string
  slug: string
  name: { ru: string; en: string }
}

// --- Resume ---

export type ResumeStatusEnum = 'draft' | 'moderation' | 'published' | 'rejected' | 'archived'

export type ResumeWorkFormatEnum = 'office' | 'remote' | 'hybrid' | 'any'

export type ResumeCurrencyEnum = 'USD' | 'EUR' | 'RUB' | 'GBP'

export interface WorkExperience {
  company: string
  position: string
  startDate: string
  endDate?: string | null
  current?: boolean
  description?: string | null
}

export interface Education {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate?: string | null
  current?: boolean
}

export interface ResumeUserRef {
  id: number
  firstName: string
  lastName: string
}

export interface Resume {
  id: number
  documentId: string
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string | null
  desiredSalary?: number | null
  currency?: ResumeCurrencyEnum | null
  workFormat: ResumeWorkFormatEnum
  employmentType: EmploymentTypeEnum
  experienceYears?: number | null
  about?: string | null
  skills?: string[] | null
  languages?: Array<{ lang: string; level: string }> | null
  contacts?: { telegram?: string; email?: string; phone?: string } | null
  workExperience?: WorkExperience[]
  education?: Education[]
  views?: number
  invitations?: number
  status: ResumeStatusEnum
  user?: ResumeUserRef | null
  avatar?: StrapiMedia | null
  createdAt: string
}

export interface ResumeListParams {
  search?: string
  country?: string
  city?: string
  workFormat?: ResumeWorkFormatEnum
  employmentType?: EmploymentTypeEnum
  experienceYears?: number
  page?: number
  pageSize?: number
}

export interface ResumeCreateInput {
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string
  desiredSalary?: number
  currency?: ResumeCurrencyEnum
  workFormat: ResumeWorkFormatEnum
  employmentType: EmploymentTypeEnum
  experienceYears?: number
  about?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  contacts?: { telegram?: string; email?: string; phone?: string }
  workExperience?: WorkExperience[]
  education?: Education[]
}

export type ResumeUpdateInput = Partial<ResumeCreateInput>
