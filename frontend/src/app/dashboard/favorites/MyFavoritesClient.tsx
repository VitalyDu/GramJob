'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import type {
  FavoriteType,
  FavoriteVacancyCard,
  FavoriteResumeCard,
  FavoriteCompanyCard,
} from '@/types/api'
import { formatSalary, WORK_FORMAT_LABELS } from '@/lib/vacancy-utils'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { RESUME_WORK_FORMAT_LABELS } from '@/lib/resume-utils'

const TABS: { label: string; value: FavoriteType | undefined }[] = [
  { label: 'Все', value: undefined },
  { label: 'Вакансии', value: 'vacancy' },
  { label: 'Резюме', value: 'resume' },
  { label: 'Компании', value: 'company' },
]

export const MyFavoritesClient = observer(function MyFavoritesClient() {
  const { favorite: store } = useStores()
  const [activeType, setActiveType] = useState<FavoriteType | undefined>(undefined)

  useEffect(() => {
    void store.fetchFavorites(activeType)
  }, [store, activeType])

  const handleTabChange = (type: FavoriteType | undefined) => {
    setActiveType(type)
  }

  const handleRemove = (type: FavoriteType, targetId: string) => {
    void store.removeFavorite(type, targetId)
  }

  const handlePageChange = (page: number) => {
    void store.fetchFavorites(activeType, page)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Избранное</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeType === tab.value
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.favorites.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">В избранном пусто.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.favorites.map((fav) => (
          <div
            key={fav.documentId}
            className="relative rounded-xl border border-gray-200 bg-white p-4"
          >
            <button
              onClick={() => handleRemove(fav.type, fav.targetId)}
              disabled={store.isLoading}
              title="Убрать из избранного"
              className="absolute right-3 top-3 text-sm text-gray-400 hover:text-red-500 disabled:opacity-50"
            >
              ✕
            </button>

            {fav.type === 'vacancy' && fav.entity ? (
              <Link href={`/vacancies/${fav.targetId}`} className="block pr-8">
                <p className="font-semibold text-gray-900">
                  {(fav.entity as FavoriteVacancyCard).title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {(fav.entity as FavoriteVacancyCard).company?.name}
                </p>
                <p className="mt-1 text-xs text-gray-400">
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
                <p className="font-semibold text-gray-900">
                  {(fav.entity as FavoriteResumeCard).title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {(fav.entity as FavoriteResumeCard).firstName}{' '}
                  {(fav.entity as FavoriteResumeCard).lastName}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {RESUME_WORK_FORMAT_LABELS[(fav.entity as FavoriteResumeCard).workFormat]} ·{' '}
                  {(fav.entity as FavoriteResumeCard).country}
                </p>
              </Link>
            ) : fav.type === 'company' && fav.entity ? (
              <Link href={`/companies/${fav.targetId}`} className="block pr-8">
                <p className="font-semibold text-gray-900">
                  {(fav.entity as FavoriteCompanyCard).name}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {COMPANY_SIZE_LABELS[(fav.entity as FavoriteCompanyCard).companySize]} ·{' '}
                  {(fav.entity as FavoriteCompanyCard).country}
                </p>
              </Link>
            ) : (
              <p className="pr-8 text-sm text-gray-400">Элемент удалён или недоступен</p>
            )}
          </div>
        ))}
      </div>

      {store.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={store.page <= 1}
            onClick={() => handlePageChange(store.page - 1)}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {store.page} / {store.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={store.page >= store.pageCount}
            onClick={() => handlePageChange(store.page + 1)}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
