import type { Company, Vacancy } from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'

// status: 0 — сетевой сбой; нужен, чтобы страницы отдавали 404 только на
// настоящий 404 API, а не кэшировали его при недоступном backend
async function fetchJson<T>(
  path: string,
  revalidate: number
): Promise<{ body: T | null; status: number }> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } })
    if (!res.ok) return { body: null, status: res.status }
    return { body: (await res.json()) as T, status: res.status }
  } catch {
    return { body: null, status: 0 }
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

export interface ServerFetchResult<T> {
  data: T | null
  notFound: boolean
}

export async function fetchVacancyServer(id: string): Promise<ServerFetchResult<Vacancy>> {
  const res = await fetchJson<{ data?: unknown }>(`/vacancies/${id}?skipViewCount=true`, 300)
  return {
    data: res.body?.data ? normalizeVacancy(res.body.data) : null,
    notFound: res.status === 404,
  }
}

export async function fetchCompanyServer(id: string): Promise<ServerFetchResult<Company>> {
  const res = await fetchJson<{ data?: Company }>(`/companies/${id}`, 300)
  return { data: res.body?.data ?? null, notFound: res.status === 404 }
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
    items: (res.body?.data ?? []).map(normalizeVacancy),
    total: res.body?.meta?.total ?? 0,
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
  return { items: res.body?.data ?? [], total: res.body?.meta?.total ?? 0 }
}
