'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { Eye, Send, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { hapticNotify } from '@/lib/telegram'
import { getMediaUrl } from '@/lib/media'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { ApplyDialog } from '@/components/application/ApplyDialog'
import { FavoriteButton } from '@/components/favorite/FavoriteButton'
import { ReportDialog } from '@/components/report/ReportDialog'
import { BlockButton } from '@/components/block/BlockButton'
import { CardListSkeleton, ErrorState } from '@/components/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  WORK_FORMAT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  formatSalary,
} from '@/lib/vacancy-utils'
import { getCountryName } from '@/lib/countries'

interface Props {
  id: string
}

export const VacancyDetailClient = observer(function VacancyDetailClient({ id }: Props) {
  useTelegramBackButton()
  const { vacancy: store, application: appStore, auth } = useStores()
  const { t } = useTranslation()
  const [applyOpen, setApplyOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    void store.fetchVacancyById(id)
  }, [store, id])

  const handleApplyClose = () => {
    setApplyOpen(false)
    appStore.clearFlags()
  }

  const handleApplySubmit = async (resumeId: string, coverLetter: string) => {
    try {
      await appStore.createApplication({ vacancyId: id, resumeId, coverLetter })
      hapticNotify('success')
      setApplyOpen(false)
    } catch {
      // errors reflected in appStore.limitReached / appStore.alreadyApplied
    }
  }

  if (store.isLoading) {
    return <CardListSkeleton count={3} />
  }

  if (!store.currentVacancy) {
    return (
      <ErrorState
        message={t('vacancyDetail.notFound')}
        onRetry={() => void store.fetchVacancyById(id)}
      />
    )
  }

  const v = store.currentVacancy
  const salary = formatSalary(v.salaryFrom, v.salaryTo, v.salaryCurrency)
  const isInternal = v.sourceType === 'internal'
  const isPublished = v.status === 'published'
  const logoUrl = v.company.logo ? getMediaUrl(v.company.logo.url) : null

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <Card>
        <CardContent className="pt-6">
          {/* Лого + название + статус */}
          <div className="flex items-start gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={v.company.name}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold text-card-foreground">{v.title}</h1>
                <VacancyStatusBadge status={v.status} />
              </div>
              {v.company && (
                <Link
                  href={`/companies/${v.company.documentId}`}
                  className="mt-1 text-sm font-medium text-primary hover:underline"
                >
                  {v.company.name}
                </Link>
              )}
            </div>
          </div>

          {/* Бейджи */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(v.country || v.city) && (
              <Badge variant="outline">
                {v.country ? getCountryName(v.country) : ''}
                {v.city ? `, ${v.city}` : ''}
              </Badge>
            )}
            <Badge variant="outline">{WORK_FORMAT_LABELS[v.workFormat]}</Badge>
            <Badge variant="outline">{EMPLOYMENT_TYPE_LABELS[v.employmentType]}</Badge>
            <Badge variant="outline">{SENIORITY_LABELS[v.seniority]}</Badge>
            {v.urgent && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">🔥 Urgent</Badge>
            )}
          </div>

          {/* Зарплата */}
          {salary && <p className="mt-3 text-lg font-semibold text-card-foreground">{salary}</p>}

          {/* Счётчики */}
          {(v.views != null || v.applicationsCount != null) && (
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              {v.views != null && (
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {v.views}
                </span>
              )}
              {v.applicationsCount != null && (
                <span className="flex items-center gap-1">
                  <Send className="h-4 w-4" />
                  {v.applicationsCount}
                </span>
              )}
            </div>
          )}

          {/* Кнопки действий */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {isPublished && isInternal && auth.user && (
              <Button size="lg" onClick={() => setApplyOpen(true)}>
                {t('vacancyDetail.apply')}
              </Button>
            )}
            {isPublished && isInternal && !auth.user && (
              <Button size="lg" asChild>
                <Link href="/login">{t('vacancyDetail.loginToApply')}</Link>
              </Button>
            )}
            {auth.user && (
              <>
                <FavoriteButton type="vacancy" targetId={id} />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setReportOpen(true)}
                        className="text-sm text-muted-foreground hover:text-destructive"
                      >
                        {t('vacancyDetail.report')}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t('vacancyDetail.reportTooltip')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {v.postedBy && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <BlockButton targetType="employer" targetId={v.postedBy.id} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t('vacancyDetail.blockEmployer')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* External-вакансия */}
      {v.sourceType === 'external' && v.sourceUrl && (
        <Alert>
          <ExternalLink className="h-4 w-4" />
          <AlertTitle>{t('vacancyDetail.externalTitle')}</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            <span>{t('vacancyDetail.externalText')}</span>
            <Button size="sm" asChild>
              <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer">
                {t('vacancyDetail.applyOnSource')}
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Описание */}
      {v.description && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-3 text-base font-semibold text-card-foreground">
              {t('vacancyDetail.description')}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">{v.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Обязанности */}
      {v.responsibilities && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-3 text-base font-semibold text-card-foreground">
              {t('vacancyDetail.responsibilities')}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">{v.responsibilities}</p>
          </CardContent>
        </Card>
      )}

      {/* Требования */}
      {v.requirements && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-3 text-base font-semibold text-card-foreground">
              {t('vacancyDetail.requirements')}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">{v.requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Условия */}
      {v.conditions && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-3 text-base font-semibold text-card-foreground">
              {t('vacancyDetail.conditions')}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">{v.conditions}</p>
          </CardContent>
        </Card>
      )}

      {/* Навыки */}
      {v.skills && v.skills.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-3 text-base font-semibold text-card-foreground">
              {t('vacancyDetail.skills')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {v.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border-t pt-4">
        <Link href="/vacancies" className="text-sm text-muted-foreground hover:text-foreground">
          {t('vacancyDetail.backToAll')}
        </Link>
      </div>

      <ApplyDialog
        isOpen={applyOpen}
        vacancyId={id}
        vacancyTitle={v.title}
        onClose={handleApplyClose}
        onSubmit={handleApplySubmit}
        isLoading={appStore.isLoading}
        limitReached={appStore.limitReached}
        alreadyApplied={appStore.alreadyApplied}
      />

      <ReportDialog
        type="vacancy"
        targetId={id}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
})
