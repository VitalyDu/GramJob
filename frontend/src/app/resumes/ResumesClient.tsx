'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { FileText, Lock } from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { ResumeCard } from '@/components/resume/ResumeCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SaveSearchButton } from '@/components/saved-search/SaveSearchButton'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  CardListSkeleton,
  PaginationBar,
} from '@/components/shared'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
      <div>
        <PageHeader title="Резюме" description="База специалистов" />
        <EmptyState
          icon={Lock}
          title="Войдите в аккаунт"
          description="Войдите, чтобы просматривать базу резюме"
          action={
            <Button asChild>
              <Link href="/login">Войти</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (store.accessDenied) {
    return (
      <div>
        <PageHeader title="Резюме" description="База специалистов" />
        <EmptyState
          icon={Lock}
          title="Доступ закрыт"
          description="База резюме доступна на подписке Max"
          action={
            <Button asChild>
              <Link href="/subscription">Подписка Max</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Резюме" description="База специалистов" />

      <div className="md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6">
        <aside className="md:sticky md:top-20">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold text-card-foreground">Фильтры</p>
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              placeholder="Страна (RU, US...)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <Select
              value={workFormat || '__all__'}
              onValueChange={(v) =>
                setWorkFormat(v === '__all__' ? '' : (v as ResumeWorkFormatEnum))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все форматы</SelectItem>
                {(
                  Object.entries(RESUME_WORK_FORMAT_LABELS) as [ResumeWorkFormatEnum, string][]
                ).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={employmentType || '__all__'}
              onValueChange={(v) =>
                setEmploymentType(v === '__all__' ? '' : (v as EmploymentTypeEnum))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все типы занятости</SelectItem>
                {(
                  Object.entries(RESUME_EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]
                ).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 hidden md:block">
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
        </aside>

        <section className="mt-4 md:mt-0">
          <div className="mb-3 md:hidden">
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

          {store.isLoading && <CardListSkeleton count={6} />}

          {store.error && !store.isLoading && (
            <ErrorState
              message={store.error}
              onRetry={() =>
                void store.fetchResumes({
                  search,
                  country,
                  ...(workFormat ? { workFormat } : {}),
                  ...(employmentType ? { employmentType } : {}),
                })
              }
            />
          )}

          {!store.isLoading && !store.error && store.resumes.length === 0 && (
            <EmptyState icon={FileText} title="Резюме не найдены" />
          )}

          {!store.isLoading && store.resumes.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Найдено: {store.total}</p>
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
