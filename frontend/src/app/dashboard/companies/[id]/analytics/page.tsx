import { CompanyAnalyticsClient } from './CompanyAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyAnalyticsPage({ params }: Props) {
  const { id } = await params
  return <CompanyAnalyticsClient companyId={id} />
}
