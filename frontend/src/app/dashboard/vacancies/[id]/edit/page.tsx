import type { Metadata } from 'next'
import { EditVacancyClient } from './EditVacancyClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Редактировать вакансию | GramJob',
}

export default async function EditVacancyPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <EditVacancyClient id={id} />
    </div>
  )
}
