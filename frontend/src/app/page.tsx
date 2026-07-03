import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, FileText, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VacancyCard } from '@/components/vacancy/VacancyCard'
import { getLatestVacancies } from '@/lib/home-data'

export const revalidate = 300

export default async function HomePage() {
  const latest = await getLatestVacancies(6)

  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <section className="bg-brand-gradient -mx-4 -mt-6 px-4 py-16 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Image
            src="/logo-vertical.png"
            alt="GramJob"
            width={180}
            height={206}
            priority
            className="animate-fade-in-up mb-6 h-auto w-36 rounded-2xl bg-white/95 p-3 sm:w-44"
          />
          <h1 className="animate-fade-in-up animation-delay-100 text-3xl font-bold tracking-tight sm:text-5xl">
            Работа мечты — прямо в Telegram
          </h1>
          <p className="animate-fade-in-up animation-delay-200 mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Международная биржа вакансий и резюме. Находите возможности, стройте будущее.
          </p>
          <div className="animate-fade-in-up animation-delay-300 mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="font-semibold">
              <Link href="/vacancies">
                <Search className="mr-2 h-4 w-4" />
                Найти работу
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard/vacancies/new">
                Разместить вакансию
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Свежие вакансии */}
      {latest.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Свежие вакансии</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/vacancies">
                Все вакансии
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {latest.map((v) => (
              <VacancyCard key={v.documentId} vacancy={v} />
            ))}
          </div>
        </section>
      )}

      {/* Как это работает */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold tracking-tight sm:text-2xl">
          Как это работает
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: FileText,
              title: 'Создайте профиль',
              text: 'Резюме для кандидата или компания для работодателя — за пару минут.',
            },
            {
              icon: Search,
              title: 'Найдите друг друга',
              text: 'Умный поиск по отраслям, форматам работы и уровню.',
            },
            {
              icon: Send,
              title: 'Откликайтесь в один клик',
              text: 'Уведомления и статусы откликов — прямо в Telegram.',
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <p className="font-semibold">{`${i + 1}. ${title}`}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="bg-accent/60">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <h3 className="text-lg font-bold">Ищете работу?</h3>
            <p className="text-sm text-muted-foreground">
              Создайте резюме и получайте приглашения от работодателей.
            </p>
            <Button asChild>
              <Link href="/dashboard/resumes/new">Создать резюме</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-brand-orange/10">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <h3 className="text-lg font-bold">Ищете сотрудников?</h3>
            <p className="text-sm text-muted-foreground">
              Разместите вакансию — модерация занимает считанные часы.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/vacancies/new">Разместить вакансию</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
