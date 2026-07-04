import { getLatestVacancies } from '@/lib/home-data'
import { HomeContent } from './HomeContent'

export const revalidate = 300

export default async function HomePage() {
  const latest = await getLatestVacancies(6)
  return <HomeContent latest={latest} />
}
