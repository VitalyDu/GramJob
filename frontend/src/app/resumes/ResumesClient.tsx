'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { FileText, Lock } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { ResumeCard } from '@/components/resume/ResumeCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SaveSearchButton } from '@/components/saved-search/SaveSearchButton'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardListSkeleton,
  PaginationBar,
} from '@/components/shared'
import { RESUME_WORK_FORMAT_VALUES, RESUME_EMPLOYMENT_TYPE_VALUES } from '@/lib/resume-utils'
import { MultiSelect } from '@/components/ui/multi-select'
import { CountrySelect } from '@/components/ui/country-select'
import type { ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'

export const ResumesClient = observer(function ResumesClient() {
  const { resume: store, auth } = useStores()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [country, setCountry] = useState(() => searchParams.get('country') ?? '')
  const [workFormats, setWorkFormats] = useState<ResumeWorkFormatEnum[]>(
    () =>
      searchParams
        .getAll('workFormat')
        .flatMap((v) => v.split(','))
        .filter(Boolean) as ResumeWorkFormatEnum[]
  )
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentTypeEnum[]>(
    () =>
      searchParams
        .getAll('employmentType')
        .flatMap((v) => v.split(','))
        .filter(Boolean) as EmploymentTypeEnum[]
  )

  useEffect(() => {
    if (!auth.user) return // don't fetch before auth is resolved; avoids spurious 403 → accessDenied
    void store.fetchResumes({
      search,
      country,
      ...(workFormats.length > 0 ? { workFormat: workFormats } : {}),
      ...(employmentTypes.length > 0 ? { employmentType: employmentTypes } : {}),
    })
  }, [store, auth.user, search, country, workFormats, employmentTypes])

  const handlePageChange = (page: number) => {
    void store.fetchResumes({
      search,
      country,
      ...(workFormats.length > 0 ? { workFormat: workFormats } : {}),
      ...(employmentTypes.length > 0 ? { employmentType: employmentTypes } : {}),
      page,
    })
  }

  if (!auth.user) {
    return (
      <div>
        <PageHeader title={t('nav.resumes')} description={t('resumes.description')} />
        <EmptyState
          icon={Lock}
          title={t('resumes.loginRequired')}
          description={t('resumes.loginRequiredHint')}
          action={
            <Button asChild>
              <Link href="/login">{t('auth.login')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (store.accessDenied) {
    return (
      <div>
        <PageHeader title={t('nav.resumes')} description={t('resumes.description')} />
        <EmptyState
          icon={Lock}
          title={t('resumes.accessDenied')}
          description={t('resumes.accessDeniedHint')}
          action={
            <Button asChild>
              <Link href="/subscription">{t('resumes.subscribeMax')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('nav.resumes')} description={t('resumes.description')} />

      {/* Поиск — на всю ширину */}
      <div className="mb-4">
        <Input
          placeholder={t('resumes.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('resumes.searchPlaceholder')}
        />
      </div>

      <div className="md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
        <aside className="md:sticky md:top-20">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="space-y-1.5">
              <Label>{t('filters.country')}</Label>
              <CountrySelect
                value={country}
                onChange={setCountry}
                placeholder={t('filters.anyCountry')}
              />
            </div>
            <MultiSelect
              label={t('filters.allFormats')}
              options={(RESUME_WORK_FORMAT_VALUES as readonly ResumeWorkFormatEnum[]).map(
                (value) => ({ value, label: t(`enums.resumeWorkFormat.${value}`) })
              )}
              value={workFormats}
              onChange={setWorkFormats}
            />
            <MultiSelect
              label={t('filters.allTypes')}
              options={(RESUME_EMPLOYMENT_TYPE_VALUES as readonly EmploymentTypeEnum[]).map(
                (value) => ({ value, label: t(`enums.employmentType.${value}`) })
              )}
              value={employmentTypes}
              onChange={setEmploymentTypes}
            />
          </div>
          <div className="mt-3 hidden md:block">
            <SaveSearchButton
              searchType="resume"
              filters={{
                ...(search ? { search } : {}),
                ...(country ? { country } : {}),
                ...(workFormats.length > 0 ? { workFormat: workFormats } : {}),
                ...(employmentTypes.length > 0 ? { employmentType: employmentTypes } : {}),
              }}
            />
          </div>
        </aside>

        <section className="mt-4 md:mt-0">
          <div className="mb-3 md:hidden">
            <SaveSearchButton
              searchType="resume"
              filters={{
                ...(search ? { search } : {}),
                ...(country ? { country } : {}),
                ...(workFormats.length > 0 ? { workFormat: workFormats } : {}),
                ...(employmentTypes.length > 0 ? { employmentType: employmentTypes } : {}),
              }}
            />
          </div>

          {store.isLoading && <CardListSkeleton count={6} />}

          {store.error && !store.isLoading && (
            <ErrorState
              message={store.error}
              onRetry={() =>
                void store.fetchResumes({
                  search,
                  country,
                  ...(workFormats.length > 0 ? { workFormat: workFormats } : {}),
                  ...(employmentTypes.length > 0 ? { employmentType: employmentTypes } : {}),
                })
              }
            />
          )}

          {!store.isLoading && !store.error && store.resumes.length === 0 && (
            <EmptyState icon={FileText} title={t('resumes.notFound')} />
          )}

          {!store.isLoading && store.resumes.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('common.found', { count: store.total })}
              </p>
              <div className="space-y-3">
                {store.resumes.map((r) => (
                  <ResumeCard key={r.documentId} resume={r} />
                ))}
              </div>
              <PaginationBar
                page={store.page}
                pageCount={store.pageCount}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
})
