import type { Vacancy } from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'
const REVALIDATE = { next: { revalidate: 300 } } as const

export interface HomeStats {
  vacancies: number
  companies: number
  industries: number
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, REVALIDATE)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

type ListResponse = { data: unknown[]; meta?: { total?: number } }

export async function getHomeStats(): Promise<HomeStats> {
  const [vacancies, companies, industries] = await Promise.all([
    fetchJson<ListResponse>('/vacancies?page=1&pageSize=1'),
    fetchJson<ListResponse>('/companies?page=1&pageSize=1'),
    fetchJson<{ data: unknown[] }>('/industries'),
  ])
  return {
    vacancies: vacancies?.meta?.total ?? 0,
    companies: companies?.meta?.total ?? 0,
    industries: industries?.data?.length ?? 0,
  }
}

function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string' && val) return [val]
  return []
}

function normalizeVacancy(v: unknown): Vacancy {
  const raw = v as Record<string, unknown>
  return {
    ...raw,
    workFormat: ensureArray(raw['workFormat']),
    employmentType: ensureArray(raw['employmentType']),
    seniority: ensureArray(raw['seniority']),
  } as Vacancy
}

export async function getLatestVacancies(limit: number): Promise<Vacancy[]> {
  const res = await fetchJson<{ data: unknown[] }>(
    `/vacancies?page=1&pageSize=${limit}&sort=newest`
  )
  return res?.data?.map(normalizeVacancy) ?? []
}

// VIP-вакансии для блока «Рекомендуем» (highlighted=true ставится в beforeCreate только VIP-авторам)
export async function getRecommendedVacancies(limit: number): Promise<Vacancy[]> {
  const res = await fetchJson<{ data: unknown[] }>(
    `/vacancies?page=1&pageSize=${limit}&highlighted=true&sort=relevance`
  )
  return res?.data?.map(normalizeVacancy) ?? []
}
