import { ResumeAnalyticsClient } from './ResumeAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResumeAnalyticsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container px-4 py-8">
      <ResumeAnalyticsClient resumeId={id} />
    </div>
  )
}
