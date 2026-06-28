import { EditResumeClient } from './EditResumeClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditResumePage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <EditResumeClient id={id} />
    </div>
  )
}
