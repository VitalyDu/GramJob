import type { Metadata } from 'next'
import { VacanciesClient } from './VacanciesClient'

export const metadata: Metadata = {
  title: 'Вакансии | GramJob',
  description: 'Поиск работы в международной бирже вакансий GramJob',
}

export default function VacanciesPage() {
  return <VacanciesClient />
}
