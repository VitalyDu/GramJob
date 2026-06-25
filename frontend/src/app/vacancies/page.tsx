import type { Metadata } from 'next'
import { VacanciesClient } from './VacanciesClient'

export const metadata: Metadata = {
  title: 'Вакансии | GramJob',
  description: 'Поиск работы в международной бирже вакансий GramJob',
}

export default function VacanciesPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Вакансии</h1>
      <VacanciesClient />
    </div>
  )
}
