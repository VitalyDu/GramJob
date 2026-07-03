'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type {
  VacancyListParams,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
} from '@/types/api'
import { WORK_FORMAT_LABELS, EMPLOYMENT_TYPE_LABELS, SENIORITY_LABELS } from '@/lib/vacancy-utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface Props {
  params: VacancyListParams
  onChange: (params: VacancyListParams) => void
}

const ALL = '__all__'

const SORT_OPTIONS = [
  { value: ALL, label: 'По умолчанию' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'salary_desc', label: 'Зарплата ↓' },
  { value: 'salary_asc', label: 'Зарплата ↑' },
  { value: 'relevance', label: 'По релевантности' },
] as const

type Draft = {
  country: string
  workFormat: WorkFormatEnum | ''
  employmentType: EmploymentTypeEnum | ''
  seniority: SeniorityEnum | ''
  sort: string
}

function draftFromParams(params: VacancyListParams): Draft {
  return {
    country: params.country ?? '',
    workFormat: params.workFormat ?? '',
    employmentType: params.employmentType ?? '',
    seniority: params.seniority ?? '',
    sort: params.sort ?? '',
  }
}

function countActive(draft: Draft): number {
  return [draft.country, draft.workFormat, draft.employmentType, draft.seniority].filter(Boolean)
    .length
}

function FilterFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const enumSelect = <T extends string>(
    label: string,
    value: T | '',
    labels: Record<T, string>,
    allLabel: string,
    set: (v: T | '') => void
  ) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || ALL} onValueChange={(v) => set(v === ALL ? '' : (v as T))}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {(Object.entries(labels) as [T, string][]).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="filter-country">Страна</Label>
        <Input
          id="filter-country"
          value={draft.country}
          onChange={(e) => setDraft({ ...draft, country: e.target.value })}
          placeholder="RU, US..."
        />
      </div>
      {enumSelect('Формат работы', draft.workFormat, WORK_FORMAT_LABELS, 'Все форматы', (v) =>
        setDraft({ ...draft, workFormat: v })
      )}
      {enumSelect('Занятость', draft.employmentType, EMPLOYMENT_TYPE_LABELS, 'Все типы', (v) =>
        setDraft({ ...draft, employmentType: v })
      )}
      {enumSelect('Уровень', draft.seniority, SENIORITY_LABELS, 'Все уровни', (v) =>
        setDraft({ ...draft, seniority: v })
      )}
      <div className="space-y-1.5">
        <Label>Сортировка</Label>
        <Select
          value={draft.sort || ALL}
          onValueChange={(v) => setDraft({ ...draft, sort: v === ALL ? '' : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function VacancyFilters({ params, onChange }: Props) {
  const [search, setSearch] = useState(params.search ?? '')
  const [draft, setDraft] = useState<Draft>(draftFromParams(params))
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeCount = countActive(draftFromParams(params))

  const apply = () => {
    const next: VacancyListParams = { page: 1 }
    if (search) next.search = search
    if (draft.country) next.country = draft.country
    if (draft.workFormat) next.workFormat = draft.workFormat
    if (draft.employmentType) next.employmentType = draft.employmentType
    if (draft.seniority) next.seniority = draft.seniority
    if (draft.sort) next.sort = draft.sort as NonNullable<VacancyListParams['sort']>
    onChange(next)
    setSheetOpen(false)
  }

  const reset = () => {
    setSearch('')
    setDraft(draftFromParams({}))
    onChange({ page: 1 })
    setSheetOpen(false)
  }

  return (
    <div className="space-y-3">
      {/* Строка поиска + mobile-кнопка «Фильтры» */}
      <form
        role="search"
        aria-label="Поиск вакансий"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск вакансий..."
          className="flex-1"
        />
        <Button type="submit">Найти</Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="md:hidden">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Фильтры
              {activeCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1">{activeCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Фильтры</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-2">
              <FilterFields draft={draft} setDraft={setDraft} />
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Сбросить
              </Button>
              <Button className="flex-1" onClick={apply}>
                Найти
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </form>

      {/* Desktop-панель — всегда видима на md+ */}
      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterFields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={apply}>
              Найти
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
