import { ApplicationDetailClient } from './ApplicationDetailClient'

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="container px-4 py-8">
      <ApplicationDetailClient documentId={id} />
    </div>
  )
}
