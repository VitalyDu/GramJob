import { ResumeAnalyticsClient } from './ResumeAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResumeAnalyticsPage({ params }: Props) {
  const { id } = await params
  return <ResumeAnalyticsClient resumeId={id} />
}
