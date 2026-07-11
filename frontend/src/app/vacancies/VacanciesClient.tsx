'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Briefcase, Plus, Search } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { VacancyCard } from '@/components/vacancy/VacancyCard'
import { VacancyFilters } from '@/components/vacancy/VacancyFilters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardListSkeleton,
  PaginationBar,
  ActiveFilterChips,
} from '@/components/shared'
import { parseVacancySearchParams } from '@/lib/search-params'
import { getCountryName } from '@/lib/countries'
import { api } from '@/services/api'
import type { Industry, Vacancy, VacancyListParams } from '@/types/api'

interface Props {
  initialVacancies?: Vacancy[]
  initialTotal?: number
}

export const VacanciesClient = observer(function VacanciesClient({
  initialVacancies,
  initialTotal,
}: Props) {
  const { vacancy: store, auth } = useStores()
  const { t, i18n } = useTranslation()
  const searchParams = useSearchParams()
  const initialParamsRef = useRef<VacancyListParams | null>(null)
  if (initialParamsRef.current === null) {
    initialParamsRef.current = parseVacancySearchParams(searchParams)
  }
  const [params, setParams] = useState<VacancyListParams>(initialParamsRef.current)
  const [searchInput, setSearchInput] = useState(initialParamsRef.current.search ?? '')
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [industries, setIndustries] = useState<Industry[]>([])

  useEffect(() => {
    setMounted(true)
    void store
      .fetchVacancies(initialParamsRef.current ?? { page: 1 })
      .finally(() => setLoadedOnce(true))
  }, [store])

  useEffect(() => {
    void api
      .get<{ data: Industry[] }>('/industries')
      .then((res) => setIndustries(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
  }, [])

  const handleParamsChange = (next: VacancyListParams) => {
    setParams(next)
    void store.fetchVacancies(next)
  }

  const handlePageChange = (page: number) => {
    const next = { ...params, page }
    setParams(next)
    void store.fetchVacancies(next)
  }

  const handleReset = () => {
    handleParamsChange({ page: 1 })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const next: VacancyListParams = { ...params, page: 1 }
    if (searchInput) {
      next.search = searchInput
    } else {
      delete next.search
    }
    setParams(next)
    void store.fetchVacancies(next)
  }

  const lang = i18n.language === 'en' ? 'en' : 'ru'

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []

    if (params.country) {
      const country = params.country
      chips.push({
        key: 'country',
        label: getCountryName(country, i18n.language),
        onRemove: () => {
          const next = { ...params, page: 1 }
          delete next.country
          handleParamsChange(next)
        },
      })
    }

    if (params.industry) {
      const ind = industries.find((i) => i.documentId === params.industry)
      const industryDocId = params.industry
      chips.push({
        key: 'industry',
        label: ind ? ind.name[lang] : t('filters.industry'),
        onRemove: () => {
          const next = { ...params, page: 1 }
          delete next.industry
          delete next.specialization
          handleParamsChange(next)
        },
      })

      if (params.specialization) {
        const spec = ind?.specializations?.find((s) => s.documentId === params.specialization)
        chips.push({
          key: 'specialization',
          label: spec ? spec.name[lang] : t('filters.specialization'),
          onRemove: () => {
            const next = { ...params, page: 1 }
            delete next.specialization
            handleParamsChange(next)
          },
        })
      }
      void industryDocId
    }

    for (const wf of params.workFormat ?? []) {
      const val = wf
      chips.push({
        key: `wf_${wf}`,
        label: t(`enums.workFormat.${wf}`),
        onRemove: () => {
          const next = { ...params, page: 1 }
          const remaining = (params.workFormat ?? []).filter((x) => x !== val)
          if (remaining.length > 0) {
            next.workFormat = remaining
          } else {
            delete next.workFormat
          }
          handleParamsChange(next)
        },
      })
    }

    for (const et of params.employmentType ?? []) {
      const val = et
      chips.push({
        key: `et_${et}`,
        label: t(`enums.employmentType.${et}`),
        onRemove: () => {
          const next = { ...params, page: 1 }
          const remaining = (params.employmentType ?? []).filter((x) => x !== val)
          if (remaining.length > 0) {
            next.employmentType = remaining
          } else {
            delete next.employmentType
          }
          handleParamsChange(next)
        },
      })
    }

    for (const s of params.seniority ?? []) {
      const val = s
      chips.push({
        key: `seniority_${s}`,
        label: t(`enums.seniority.${s}`),
        onRemove: () => {
          const next = { ...params, page: 1 }
          const remaining = (params.seniority ?? []).filter((x) => x !== val)
          if (remaining.length > 0) {
            next.seniority = remaining
          } else {
            delete next.seniority
          }
          handleParamsChange(next)
        },
      })
    }

    if (params.salaryFrom != null) {
      const val = params.salaryFrom
      chips.push({
        key: 'salaryFrom',
        label: `${t('filters.from')} ${val}`,
        onRemove: () => {
          const next = { ...params, page: 1 }
          delete next.salaryFrom
          handleParamsChange(next)
        },
      })
    }

    if (params.salaryTo != null) {
      const val = params.salaryTo
      chips.push({
        key: 'salaryTo',
        label: `${t('filters.to')} ${val}`,
        onRemove: () => {
          const next = { ...params, page: 1 }
          delete next.salaryTo
          handleParamsChange(next)
        },
      })
    }

    if (params.salaryCurrency) {
      chips.push({
        key: 'salaryCurrency',
        label: params.salaryCurrency,
        onRemove: () => {
          const next = { ...params, page: 1 }
          delete next.salaryCurrency
          handleParamsChange(next)
        },
      })
    }

    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, industries, lang])

  const useInitial =
    !loadedOnce && store.vacancies.length === 0 && (initialVacancies?.length ?? 0) > 0
  const items = useInitial ? (initialVacancies ?? []) : store.vacancies
  const total = useInitial ? (initialTotal ?? 0) : store.total
  const page = useInitial ? 1 : store.page
  const pageCount = useInitial ? Math.ceil((initialTotal ?? 0) / 20) : store.pageCount
  const showSkeleton = store.isLoading && items.length === 0

  return (
    <div>
      <PageHeader
        title={t('nav.vacancies')}
        description={t('vacancies.description')}
        actions={
          mounted && auth.isAuthenticated ? (
            <Button
              asChild
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-full"
              aria-label={t('dashboard.vacancies.createNew')}
            >
              <Link href="/dashboard/vacancies/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
        <aside className="md:sticky md:top-20">
          <VacancyFilters params={params} onChange={handleParamsChange} />
        </aside>

        <section className="mt-4 md:mt-0">
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('vacancies.searchPlaceholder')}
              className="flex-1"
              aria-label={t('vacancies.searchPlaceholder')}
            />
            <Button type="submit">
              <Search className="mr-1.5 h-4 w-4" />
              {t('common.search')}
            </Button>
          </form>

          <ActiveFilterChips chips={activeChips} />

          {showSkeleton && <CardListSkeleton count={6} />}

          {store.error && !store.isLoading && (
            <ErrorState message={store.error} onRetry={() => void store.fetchVacancies(params)} />
          )}

          {!store.isLoading && !store.error && items.length === 0 && (
            <EmptyState
              icon={Briefcase}
              title={t('vacancies.notFound')}
              description={t('vacancies.notFoundHint')}
              action={<Button onClick={handleReset}>{t('common.resetFilters')}</Button>}
            />
          )}

          {!showSkeleton && items.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('common.found', { count: total })}
              </p>
              <div className="space-y-3">
                {items.map((v) => (
                  <VacancyCard key={v.documentId} vacancy={v} />
                ))}
              </div>
              <PaginationBar page={page} pageCount={pageCount} onPageChange={handlePageChange} />
            </>
          )}
        </section>
      </div>
    </div>
  )
})
