import type { Metadata } from 'next'
import { EditCompanyClient } from './EditCompanyClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Редактировать компанию | GramJob',
}

export default async function EditCompanyPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="mx-auto w-full max-w-2xl">
      <EditCompanyClient id={id} />
    </div>
  )
}
