import type { Company, Vacancy } from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'

async function fetchJson<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
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

export interface ListPage<T> {
  items: T[]
  total: number
}

type ListResponse<T> = { data?: T[]; meta?: { total?: number } }

export async function fetchVacancyServer(id: string): Promise<Vacancy | null> {
  const res = await fetchJson<{ data?: unknown }>(`/vacancies/${id}?skipViewCount=true`, 300)
  return res?.data ? normalizeVacancy(res.data) : null
}

export async function fetchCompanyServer(id: string): Promise<Company | null> {
  const res = await fetchJson<{ data?: Company }>(`/companies/${id}`, 300)
  return res?.data ?? null
}

export async function fetchVacanciesPageServer(
  page: number,
  pageSize: number
): Promise<ListPage<Vacancy>> {
  const res = await fetchJson<ListResponse<unknown>>(
    `/vacancies?page=${page}&pageSize=${pageSize}`,
    3600
  )
  return {
    items: (res?.data ?? []).map(normalizeVacancy),
    total: res?.meta?.total ?? 0,
  }
}

export async function fetchCompaniesPageServer(
  page: number,
  pageSize: number
): Promise<ListPage<Company>> {
  const res = await fetchJson<ListResponse<Company>>(
    `/companies?page=${page}&pageSize=${pageSize}`,
    3600
  )
  return { items: res?.data ?? [], total: res?.meta?.total ?? 0 }
}
