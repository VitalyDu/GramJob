'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { FavoriteButton } from '@/components/favorite/FavoriteButton'
import { ReportDialog } from '@/components/report/ReportDialog'
import { BlockButton } from '@/components/block/BlockButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CardListSkeleton, EmptyState, ErrorState } from '@/components/shared'
import { getCountryName } from '@/lib/countries'
import { SALARY_CURRENCY_SYMBOLS } from '@/lib/vacancy-utils'
import type { SalaryCurrencyEnum } from '@/types/api'

interface Props {
  id: string
}

export const ResumeDetailClient = observer(function ResumeDetailClient({ id }: Props) {
  const { resume: store, auth } = useStores()
  const { t, i18n } = useTranslation()
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    void store.fetchResumeById(id)
  }, [store, id])

  if (store.isLoading) {
    return <CardListSkeleton count={3} />
  }

  if (store.accessDenied) {
    return (
      <EmptyState
        icon={Lock}
        title={t('resumeDetail.accessDeniedTitle')}
        description={
          auth.user ? t('resumeDetail.accessDeniedAuth') : t('resumeDetail.accessDeniedNoAuth')
        }
        action={
          <Button asChild>
            <Link href={auth.user ? '/subscription' : '/login'}>
              {auth.user ? t('resumeDetail.goToSubscriptions') : t('auth.login')}
            </Link>
          </Button>
        }
      />
    )
  }

  if (store.error || !store.currentResume) {
    return (
      <ErrorState
        message={store.error ?? t('resumeDetail.notFound')}
        onRetry={() => void store.fetchResumeById(id)}
      />
    )
  }

  const r = store.currentResume
  const name = `${r.firstName} ${r.lastName}`
  const initials = `${r.firstName.charAt(0)}${r.lastName.charAt(0)}`.toUpperCase()
  const salarySymbol = r.currency
    ? (SALARY_CURRENCY_SYMBOLS[r.currency as SalaryCurrencyEnum] ?? '')
    : ''

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-card-foreground">{r.title}</h1>
                <ResumeStatusBadge status={r.moderationStatus} />
              </div>
              <p className="mt-0.5 text-base font-medium text-foreground">{name}</p>

              {r.desiredSalary && (
                <p className="mt-1 text-lg font-semibold text-card-foreground">
                  {t('resumeDetail.salaryFrom')} {salarySymbol}
                  {r.desiredSalary.toLocaleString('ru')}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {r.country && (
                  <Badge variant="secondary">
                    {getCountryName(r.country, i18n.language)}
                    {r.city ? `, ${r.city}` : ''}
                  </Badge>
                )}
                {r.workFormat?.map((wf) => (
                  <Badge key={wf} variant="secondary">
                    {t(`enums.resumeWorkFormat.${wf}`)}
                  </Badge>
                ))}
                {r.employmentType?.map((et) => (
                  <Badge key={et} variant="secondary">
                    {t(`enums.employmentType.${et}`)}
                  </Badge>
                ))}
                {r.experienceYears !== null && r.experienceYears !== undefined && (
                  <Badge variant="outline">
                    {t('resumeDetail.experienceYears', { count: r.experienceYears })}
                  </Badge>
                )}
              </div>

              {auth.user && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <FavoriteButton type="resume" targetId={id} />
                  <button
                    onClick={() => setReportOpen(true)}
                    className="text-sm text-muted-foreground hover:text-destructive"
                  >
                    {t('resumeDetail.report')}
                  </button>
                  {r.user && <BlockButton targetType="candidate" targetId={r.user.id} />}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      {r.about && (
        <Card>
          <CardHeader>
            <CardTitle>{t('resumeDetail.about')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground">{r.about}</p>
          </CardContent>
        </Card>
      )}

      {/* Work experience */}
      {r.workExperience && r.workExperience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('resumeDetail.workExperience')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-l-2 border-border pl-4 space-y-5">
              {r.workExperience.map((w, i) => (
                <div key={i}>
                  <p className="font-semibold text-card-foreground">{w.position}</p>
                  <p className="text-sm text-muted-foreground">{w.company}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {w.startDate} — {w.current ? t('resumeDetail.present') : (w.endDate ?? '')}
                  </p>
                  {w.description && (
                    <p className="mt-1.5 text-sm text-foreground">{w.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {r.education && r.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('resumeDetail.education')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-l-2 border-border pl-4 space-y-5">
              {r.education.map((e, i) => (
                <div key={i}>
                  <p className="font-semibold text-card-foreground">
                    {e.degree} — {e.field}
                  </p>
                  <p className="text-sm text-muted-foreground">{e.institution}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.startDate} — {e.current ? t('resumeDetail.present') : (e.endDate ?? '')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {r.skills && r.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('resumeDetail.skills')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {r.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Languages */}
      {r.languages && r.languages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('resumeDetail.languages')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {r.languages.map((l, i) => (
                <Badge key={i} variant="secondary">
                  {l.level ? `${l.lang} — ${l.level}` : l.lang}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('resumeDetail.contacts')}</CardTitle>
        </CardHeader>
        <CardContent>
          {r.contacts && (r.contacts.telegram || r.contacts.email || r.contacts.phone) ? (
            <div className="space-y-1.5 text-sm text-foreground">
              {r.contacts.telegram && (
                <p>
                  {t('resumeDetail.telegram')}:{' '}
                  <a
                    href={`https://t.me/${r.contacts.telegram.replace('@', '')}`}
                    className="text-primary hover:underline"
                  >
                    {r.contacts.telegram}
                  </a>
                </p>
              )}
              {r.contacts.email && (
                <p>
                  {t('resumeDetail.email')}:{' '}
                  <a href={`mailto:${r.contacts.email}`} className="text-primary hover:underline">
                    {r.contacts.email}
                  </a>
                </p>
              )}
              {r.contacts.phone && (
                <p>
                  {t('resumeDetail.phone')}: {r.contacts.phone}
                </p>
              )}
            </div>
          ) : (
            <Alert>
              <AlertDescription>{t('resumeDetail.contactsLocked')}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="border-t pt-4">
        <Link href="/resumes" className="text-sm text-muted-foreground hover:text-foreground">
          {t('resumeDetail.backToAll')}
        </Link>
      </div>

      <ReportDialog
        type="resume"
        targetId={id}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
})
