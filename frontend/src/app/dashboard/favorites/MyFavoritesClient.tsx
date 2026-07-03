'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import type {
  FavoriteType,
  FavoriteVacancyCard,
  FavoriteResumeCard,
  FavoriteCompanyCard,
} from '@/types/api'
import { formatSalary, WORK_FORMAT_LABELS } from '@/lib/vacancy-utils'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { RESUME_WORK_FORMAT_LABELS } from '@/lib/resume-utils'

const TABS: { label: string; value: string; type: FavoriteType | undefined }[] = [
  { label: 'Все', value: 'all', type: undefined },
  { label: 'Вакансии', value: 'vacancy', type: 'vacancy' },
  { label: 'Резюме', value: 'resume', type: 'resume' },
  { label: 'Компании', value: 'company', type: 'company' },
]

export const MyFavoritesClient = observer(function MyFavoritesClient() {
  const { favorite: store } = useStores()
  const [activeType, setActiveType] = useState<FavoriteType | undefined>(undefined)

  useEffect(() => {
    void store.fetchFavorites(activeType)
  }, [store, activeType])

  const handleTabChange = (value: string) => {
    const tab = TABS.find((t) => t.value === value)
    setActiveType(tab?.type)
  }

  const handleRemove = (type: FavoriteType, targetId: string) => {
    void store.removeFavorite(type, targetId)
  }

  const handlePageChange = (page: number) => {
    void store.fetchFavorites(activeType, page)
  }

  const activeValue = TABS.find((t) => t.type === activeType)?.value ?? 'all'

  return (
    <div className="space-y-6">
      <PageHeader title="Избранное" />

      <Tabs value={activeValue} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {store.isLoading && <CardListSkeleton count={6} />}

            {store.error && !store.isLoading && (
              <ErrorState
                message={store.error}
                onRetry={() => void store.fetchFavorites(activeType)}
              />
            )}

            {!store.isLoading && store.favorites.length === 0 && !store.error && (
              <EmptyState
                icon={Star}
                title="В избранном пусто"
                description="Добавляйте вакансии, резюме и компании в избранное, чтобы быстро возвращаться к ним"
              />
            )}

            <div className="space-y-3">
              {store.favorites.map((fav) => (
                <div
                  key={fav.documentId}
                  className="relative rounded-xl border border-border bg-card p-4"
                >
                  <button
                    onClick={() => handleRemove(fav.type, fav.targetId)}
                    disabled={store.isLoading}
                    title="Убрать из избранного"
                    className="absolute right-3 top-3 text-sm text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    ✕
                  </button>

                  {fav.type === 'vacancy' && fav.entity ? (
                    <Link href={`/vacancies/${fav.targetId}`} className="block pr-8">
                      <p className="font-semibold text-card-foreground">
                        {(fav.entity as FavoriteVacancyCard).title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {(fav.entity as FavoriteVacancyCard).company?.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {WORK_FORMAT_LABELS[(fav.entity as FavoriteVacancyCard).workFormat]} ·{' '}
                        {(fav.entity as FavoriteVacancyCard).country}
                        {(() => {
                          const e = fav.entity as FavoriteVacancyCard
                          const salary = formatSalary(e.salaryFrom, e.salaryTo, e.salaryCurrency)
                          return salary ? ` · ${salary}` : ''
                        })()}
                      </p>
                    </Link>
                  ) : fav.type === 'resume' && fav.entity ? (
                    <Link href={`/resumes/${fav.targetId}`} className="block pr-8">
                      <p className="font-semibold text-card-foreground">
                        {(fav.entity as FavoriteResumeCard).title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {(fav.entity as FavoriteResumeCard).firstName}{' '}
                        {(fav.entity as FavoriteResumeCard).lastName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {RESUME_WORK_FORMAT_LABELS[(fav.entity as FavoriteResumeCard).workFormat]} ·{' '}
                        {(fav.entity as FavoriteResumeCard).country}
                      </p>
                    </Link>
                  ) : fav.type === 'company' && fav.entity ? (
                    <Link href={`/companies/${fav.targetId}`} className="block pr-8">
                      <p className="font-semibold text-card-foreground">
                        {(fav.entity as FavoriteCompanyCard).name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {COMPANY_SIZE_LABELS[(fav.entity as FavoriteCompanyCard).companySize]} ·{' '}
                        {(fav.entity as FavoriteCompanyCard).country}
                      </p>
                    </Link>
                  ) : (
                    <p className="pr-8 text-sm text-muted-foreground">
                      Элемент удалён или недоступен
                    </p>
                  )}
                </div>
              ))}
            </div>

            <PaginationBar
              page={store.page}
              pageCount={store.pageCount}
              onPageChange={handlePageChange}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
})
