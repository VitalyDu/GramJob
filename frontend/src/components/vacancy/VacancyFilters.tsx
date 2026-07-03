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
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CountrySelect } from '@/components/ui/country-select'

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
  workFormat: WorkFormatEnum[]
  employmentType: EmploymentTypeEnum[]
  seniority: SeniorityEnum[]
  sort: string
}

function draftFromParams(params: VacancyListParams): Draft {
  return {
    country: params.country ?? '',
    workFormat: params.workFormat ?? [],
    employmentType: params.employmentType ?? [],
    seniority: params.seniority ?? [],
    sort: params.sort ?? '',
  }
}

function countActive(draft: Draft): number {
  return [draft.country, ...draft.workFormat, ...draft.employmentType, ...draft.seniority].filter(
    Boolean
  ).length
}

function FilterFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Страна</Label>
        <CountrySelect
          value={draft.country}
          onChange={(v) => setDraft({ ...draft, country: v })}
          placeholder="Любая страна"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Формат работы</Label>
        <MultiSelect
          label="Все форматы"
          options={(Object.entries(WORK_FORMAT_LABELS) as [WorkFormatEnum, string][]).map(
            ([value, label]) => ({ value, label })
          )}
          value={draft.workFormat}
          onChange={(v) => setDraft({ ...draft, workFormat: v })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Занятость</Label>
        <MultiSelect
          label="Все типы"
          options={(Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]).map(
            ([value, label]) => ({ value, label })
          )}
          value={draft.employmentType}
          onChange={(v) => setDraft({ ...draft, employmentType: v })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Уровень</Label>
        <MultiSelect
          label="Все уровни"
          options={(Object.entries(SENIORITY_LABELS) as [SeniorityEnum, string][]).map(
            ([value, label]) => ({ value, label })
          )}
          value={draft.seniority}
          onChange={(v) => setDraft({ ...draft, seniority: v })}
        />
      </div>
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
  const [draft, setDraft] = useState<Draft>(draftFromParams(params))
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeCount = countActive(draftFromParams(params))

  const apply = (d: Draft = draft) => {
    const next: VacancyListParams = { page: 1 }
    if (params.search) next.search = params.search
    if (d.country) next.country = d.country
    if (d.workFormat.length > 0) next.workFormat = d.workFormat
    if (d.employmentType.length > 0) next.employmentType = d.employmentType
    if (d.seniority.length > 0) next.seniority = d.seniority
    if (d.sort) next.sort = d.sort as NonNullable<VacancyListParams['sort']>
    onChange(next)
    setSheetOpen(false)
  }

  const reset = () => {
    const empty = draftFromParams({})
    setDraft(empty)
    onChange({ page: 1 })
    setSheetOpen(false)
  }

  return (
    <div>
      {/* Mobile-кнопка «Фильтры» */}
      <div className="mb-3 md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
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
              <Button className="flex-1" onClick={() => apply()}>
                Применить
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop-панель */}
      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterFields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => apply()}>
              Применить
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
