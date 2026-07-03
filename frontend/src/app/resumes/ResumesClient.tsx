'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ResumeCard } from '@/components/resume/ResumeCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'
import { SaveSearchButton } from '@/components/saved-search/SaveSearchButton'
import type { ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'

export const ResumesClient = observer(function ResumesClient() {
  const { resume: store, auth } = useStores()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')
  const [workFormat, setWorkFormat] = useState<ResumeWorkFormatEnum | ''>('')
  const [employmentType, setEmploymentType] = useState<EmploymentTypeEnum | ''>('')

  useEffect(() => {
    if (!auth.user) return // don't fetch before auth is resolved; avoids spurious 403 → accessDenied
    void store.fetchResumes({
      search,
      country,
      ...(workFormat ? { workFormat } : {}),
      ...(employmentType ? { employmentType } : {}),
    })
  }, [store, auth.user, search, country, workFormat, employmentType])

  const handlePageChange = (page: number) => {
    void store.fetchResumes({
      search,
      country,
      ...(workFormat ? { workFormat } : {}),
      ...(employmentType ? { employmentType } : {}),
      page,
    })
  }

  if (!auth.user) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-card-foreground">
          Войдите, чтобы просматривать базу резюме
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
          Войти
        </Link>
      </div>
    )
  }

  if (store.accessDenied) {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-semibold text-card-foreground">
          База резюме доступна на плане Max
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Оформите подписку Max или VIP, чтобы искать кандидатов и просматривать их резюме.
        </p>
        <Link
          href="/subscription"
          className="mt-6 inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Перейти к подпискам →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">База резюме</h1>
        {store.total > 0 && <p className="text-sm text-muted-foreground">{store.total} резюме</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Input
          placeholder="Страна (RU, US...)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <select
          value={workFormat}
          onChange={(e) => setWorkFormat(e.target.value as ResumeWorkFormatEnum | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Все форматы</option>
          {(Object.entries(RESUME_WORK_FORMAT_LABELS) as [ResumeWorkFormatEnum, string][]).map(
            ([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            )
          )}
        </select>
        <select
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value as EmploymentTypeEnum | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Все типы занятости</option>
          {(Object.entries(RESUME_EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]).map(
            ([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            )
          )}
        </select>
      </div>

      <div className="flex items-center justify-end">
        <SaveSearchButton
          searchType="resume"
          filters={{
            ...(search ? { search } : {}),
            ...(country ? { country } : {}),
            ...(workFormat ? { workFormat } : {}),
            ...(employmentType ? { employmentType } : {}),
          }}
        />
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.resumes.length === 0 && !store.error && !store.accessDenied && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Резюме не найдены.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.resumes.map((r) => (
          <ResumeCard key={r.documentId} resume={r} />
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
