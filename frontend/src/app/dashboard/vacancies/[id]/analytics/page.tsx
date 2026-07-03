import { VacancyAnalyticsClient } from './VacancyAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VacancyAnalyticsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container px-4 py-8">
      <VacancyAnalyticsClient vacancyId={id} />
    </div>
  )
}
