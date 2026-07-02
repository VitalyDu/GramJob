import { ApplicationDetailClient } from './ApplicationDetailClient'

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <ApplicationDetailClient documentId={id} />
    </div>
  )
}
