'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, FileText, Search, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VacancyCard } from '@/components/vacancy/VacancyCard'
import type { Vacancy } from '@/types/api'

interface Props {
  latest: Vacancy[]
  recommended?: Vacancy[]
}

export function HomeContent({ latest, recommended = [] }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <section className="bg-brand-gradient -mx-4 -mt-6 px-4 py-24 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
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
            {t('home.heroTitle')}
          </h1>
          <p className="animate-fade-in-up animation-delay-200 mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            {t('home.heroSubtitle')}
          </p>
          <div className="animate-fade-in-up animation-delay-300 mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="font-semibold">
              <Link href="/vacancies">
                <Search className="mr-2 h-4 w-4" />
                {t('home.findJob')}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard/vacancies/new">
                {t('home.postVacancy')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Recommended (VIP highlighted) vacancies */}
      {recommended.length > 0 && (
        <section>
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {t('home.recommendedVacancies')}
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/vacancies?highlighted=true">
                {t('home.allVacancies')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {recommended.map((v) => (
              <VacancyCard key={v.documentId} vacancy={v} />
            ))}
          </div>
        </section>
      )}

      {/* Latest vacancies */}
      {latest.length > 0 && (
        <section>
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {t('home.latestVacancies')}
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/vacancies">
                {t('home.allVacancies')}
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

      {/* How it works */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold tracking-tight sm:text-2xl">
          {t('home.howItWorks')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: FileText,
              title: t('home.step1Title'),
              text: t('home.step1Text'),
            },
            {
              icon: Search,
              title: t('home.step2Title'),
              text: t('home.step2Text'),
            },
            {
              icon: Send,
              title: t('home.step3Title'),
              text: t('home.step3Text'),
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
            <h3 className="text-lg font-bold">{t('home.ctaCandidateTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.ctaCandidateText')}</p>
            <Button asChild>
              <Link href="/dashboard/resumes/new">{t('home.ctaCandidateButton')}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-brand-orange/10">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <h3 className="text-lg font-bold">{t('home.ctaEmployerTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.ctaEmployerText')}</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/vacancies/new">{t('home.ctaEmployerButton')}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
