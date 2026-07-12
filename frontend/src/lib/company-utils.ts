import type { CompanySizeEnum, CompanyStatusEnum } from '@/types/api'

export const COMPANY_SIZE_LABELS: Record<CompanySizeEnum, string> = {
  size_1_10: '1–10',
  size_11_50: '11–50',
  size_51_200: '51–200',
  size_201_500: '201–500',
  size_500_plus: '500+',
}

export const COMPANY_SIZE_VALUES = [
  'size_1_10',
  'size_11_50',
  'size_51_200',
  'size_201_500',
  'size_500_plus',
] as const satisfies readonly CompanySizeEnum[]

export function canSubmitCompany(status: CompanyStatusEnum): boolean {
  return status === 'draft' || status === 'rejected'
}

export function canEditCompany(status: CompanyStatusEnum): boolean {
  return status !== 'moderation'
}

export function canDeleteCompany(status: CompanyStatusEnum): boolean {
  return status === 'draft' || status === 'rejected'
}
