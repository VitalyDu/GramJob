import { getLatestVacancies, getRecommendedVacancies } from '@/lib/home-data'
import { HomeContent } from './HomeContent'

export const revalidate = 300

export default async function HomePage() {
  const [latest, recommended] = await Promise.all([
    getLatestVacancies(6),
    getRecommendedVacancies(6),
  ])
  return <HomeContent latest={latest} recommended={recommended} />
}
