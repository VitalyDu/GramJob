import { VacancyAnalyticsClient } from './VacancyAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VacancyAnalyticsPage({ params }: Props) {
  const { id } = await params
  return <VacancyAnalyticsClient vacancyId={id} />
}
