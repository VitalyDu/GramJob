import { VacancyApplicationsClient } from './VacancyApplicationsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VacancyApplicationsPage({ params }: Props) {
  const { id } = await params
  return <VacancyApplicationsClient vacancyId={id} />
}
