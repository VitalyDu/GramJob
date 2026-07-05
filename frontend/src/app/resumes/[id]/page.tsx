import type { Metadata } from 'next'
import { ResumeDetailClient } from './ResumeDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Резюме | GramJob',
  robots: { index: false, follow: false },
}

export default async function ResumeDetailPage({ params }: Props) {
  const { id } = await params
  return <ResumeDetailClient id={id} />
}
