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

export async function getLatestVacancies(limit: number): Promise<Vacancy[]> {
  const res = await fetchJson<{ data: Vacancy[] }>(
    `/vacancies?page=1&pageSize=${limit}&sort=newest`
  )
  return res?.data ?? []
}
