import { ResumesClient } from './ResumesClient'

export const metadata = {
  title: 'База резюме | GramJob',
  description: 'Найдите лучших специалистов в базе резюме GramJob',
}

export default function ResumesPage() {
  return (
    <div className="container px-4 py-8">
      <ResumesClient />
    </div>
  )
}
