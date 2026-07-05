import type { Metadata } from 'next'
import { fetchVacancyServer } from '@/lib/server-api'
import { getMediaUrl } from '@/lib/media'
import { VacancyDetailClient } from './VacancyDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const vacancy = await fetchVacancyServer(id)
  if (!vacancy) return { title: 'Вакансия | GramJob' }

  const description =
    (vacancy.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `Вакансия ${vacancy.title} на GramJob`
  const logoUrl = getMediaUrl(vacancy.company?.logo?.url)

  return {
    title: `${vacancy.title} | GramJob`,
    description,
    alternates: { canonical: `/vacancies/${id}` },
    openGraph: {
      title: vacancy.title,
      description,
      type: 'article',
      url: `/vacancies/${id}`,
      ...(logoUrl ? { images: [logoUrl] } : {}),
    },
  }
}

export default async function VacancyPage({ params }: Props) {
  const { id } = await params
  const vacancy = await fetchVacancyServer(id)
  return <VacancyDetailClient id={id} {...(vacancy ? { initialVacancy: vacancy } : {})} />
}
