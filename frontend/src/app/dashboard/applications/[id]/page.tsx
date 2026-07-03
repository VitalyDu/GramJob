import { ApplicationDetailClient } from './ApplicationDetailClient'

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ApplicationDetailClient documentId={id} />
}
