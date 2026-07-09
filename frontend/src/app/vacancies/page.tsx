import { Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchVacanciesPageServer } from '@/lib/server-api'
import { VacanciesClient } from './VacanciesClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Вакансии | GramJob',
  description: 'Поиск работы в международной бирже вакансий GramJob',
  alternates: { canonical: '/vacancies' },
}

export default async function VacanciesPage() {
  const { items, total } = await fetchVacanciesPageServer(1, 20)
  return (
    <Suspense>
      <VacanciesClient initialVacancies={items} initialTotal={total} />
    </Suspense>
  )
}
