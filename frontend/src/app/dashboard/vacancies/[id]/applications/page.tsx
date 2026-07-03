import { VacancyApplicationsClient } from './VacancyApplicationsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VacancyApplicationsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container px-4 py-8">
      <VacancyApplicationsClient vacancyId={id} />
    </div>
  )
}
