import { ResumeDetailClient } from './ResumeDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResumeDetailPage({ params }: Props) {
  const { id } = await params
  return <ResumeDetailClient id={id} />
}
