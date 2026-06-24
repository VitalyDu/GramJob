import type { Metadata } from 'next'
import { CompanyDetailClient } from './CompanyDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Компания | GramJob',
}

export default async function CompanyPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <CompanyDetailClient id={id} />
    </div>
  )
}
