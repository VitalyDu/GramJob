import { ResumeDetailClient } from './ResumeDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResumeDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <ResumeDetailClient id={id} />
    </div>
  )
}
