import { EditResumeClient } from './EditResumeClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditResumePage({ params }: Props) {
  const { id } = await params
  return (
    <div className="mx-auto w-full max-w-3xl">
      <EditResumeClient id={id} />
    </div>
  )
}
