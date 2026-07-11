import type { Metadata } from 'next'
import { ResumesClient } from './ResumesClient'

export const metadata: Metadata = {
  title: 'База резюме | GramJob',
  description: 'Найдите лучших специалистов в базе резюме GramJob',
  robots: { index: false, follow: false },
}

export default function ResumesPage() {
  return <ResumesClient />
}
