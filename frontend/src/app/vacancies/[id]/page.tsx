import type { Metadata } from 'next'
import { VacancyDetailClient } from './VacancyDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'}/vacancies/${id}`,
      { next: { revalidate: 3600 } }
    )
    if (res.ok) {
      const json = (await res.json()) as { data?: { title?: string; description?: string } }
      const vacancy = json.data
      if (vacancy?.title) {
        return {
          title: `${vacancy.title} | GramJob`,
          description: vacancy.description ?? `Вакансия ${vacancy.title} на GramJob`,
        }
      }
    }
  } catch {
    // fallback below
  }
  return { title: 'Вакансия | GramJob' }
}

export default async function VacancyPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <VacancyDetailClient id={id} />
    </div>
  )
}
