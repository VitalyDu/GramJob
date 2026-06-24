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
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <EditCompanyClient id={id} />
    </div>
  )
}
