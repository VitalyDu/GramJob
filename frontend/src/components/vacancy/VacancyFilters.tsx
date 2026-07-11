'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  VacancyListParams,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
  Industry,
  SalaryCurrencyEnum,
} from '@/types/api'
import { WORK_FORMAT_VALUES, EMPLOYMENT_TYPE_VALUES, SENIORITY_VALUES } from '@/lib/vacancy-utils'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

const SORT_KEYS = [
  { value: ALL, key: 'filters.sortDefault' },
  { value: 'newest', key: 'filters.sortNewest' },
  { value: 'salary_desc', key: 'filters.sortSalaryDesc' },
  { value: 'salary_asc', key: 'filters.sortSalaryAsc' },
  { value: 'relevance', key: 'filters.sortRelevance' },
] as const

type Draft = {
  country: string
  industry: string
  specialization: string
  workFormat: WorkFormatEnum[]
  employmentType: EmploymentTypeEnum[]
  seniority: SeniorityEnum[]
  salaryFrom: string
  salaryTo: string
  salaryCurrency: string
  sort: string
}

function draftFromParams(params: VacancyListParams): Draft {
  return {
    country: params.country ?? '',
    industry: params.industry ?? '',
    specialization: params.specialization ?? '',
    workFormat: params.workFormat ?? [],
    employmentType: params.employmentType ?? [],
    seniority: params.seniority ?? [],
    salaryFrom: params.salaryFrom != null ? String(params.salaryFrom) : '',
    salaryTo: params.salaryTo != null ? String(params.salaryTo) : '',
    salaryCurrency: params.salaryCurrency ?? '',
    sort: params.sort ?? '',
  }
}

function countActive(draft: Draft): number {
  return [
    draft.country,
    draft.industry,
    draft.specialization,
    draft.salaryFrom,
    draft.salaryTo,
    ...draft.workFormat,
    ...draft.employmentType,
    ...draft.seniority,
  ].filter(Boolean).length
}

function FilterFields({
  draft,
  setDraft,
  industries,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
  industries: Industry[]
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ru'

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('filters.country')}</Label>
        <CountrySelect
          value={draft.country}
          onChange={(v) => setDraft({ ...draft, country: v })}
          placeholder={t('filters.anyCountry')}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('filters.industry')}</Label>
        <Select
          value={draft.industry || ALL}
          onValueChange={(v) =>
            setDraft({ ...draft, industry: v === ALL ? '' : v, specialization: '' })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filters.allIndustries')}</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind.documentId} value={ind.documentId}>
                {ind.name[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t('filters.specialization')}</Label>
        <Select
          value={draft.specialization || ALL}
          onValueChange={(v) => setDraft({ ...draft, specialization: v === ALL ? '' : v })}
          disabled={!draft.industry}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filters.allSpecializations')}</SelectItem>
            {(industries.find((i) => i.documentId === draft.industry)?.specializations ?? []).map(
              (spec) => (
                <SelectItem key={spec.documentId} value={spec.documentId}>
                  {spec.name[lang]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t('filters.salary')}</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t('filters.from')}
            value={draft.salaryFrom}
            onChange={(e) => setDraft({ ...draft, salaryFrom: e.target.value })}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t('filters.to')}
            value={draft.salaryTo}
            onChange={(e) => setDraft({ ...draft, salaryTo: e.target.value })}
          />
        </div>
        <Select
          value={draft.salaryCurrency || ALL}
          onValueChange={(v) => setDraft({ ...draft, salaryCurrency: v === ALL ? '' : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filters.anyCurrency')}</SelectItem>
            {(['USD', 'EUR', 'RUB', 'GBP'] as SalaryCurrencyEnum[]).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t('filters.workFormat')}</Label>
        <MultiSelect
          label={t('filters.allFormats')}
          options={(WORK_FORMAT_VALUES as readonly WorkFormatEnum[]).map((value) => ({
            value,
            label: t(`enums.workFormat.${value}`),
          }))}
          value={draft.workFormat}
          onChange={(v) => setDraft({ ...draft, workFormat: v })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('filters.employment')}</Label>
        <MultiSelect
          label={t('filters.allTypes')}
          options={(EMPLOYMENT_TYPE_VALUES as readonly EmploymentTypeEnum[]).map((value) => ({
            value,
            label: t(`enums.employmentType.${value}`),
          }))}
          value={draft.employmentType}
          onChange={(v) => setDraft({ ...draft, employmentType: v })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('filters.seniority')}</Label>
        <MultiSelect
          label={t('filters.allLevels')}
          options={(SENIORITY_VALUES as readonly SeniorityEnum[]).map((value) => ({
            value,
            label: t(`enums.seniority.${value}`),
          }))}
          value={draft.seniority}
          onChange={(v) => setDraft({ ...draft, seniority: v })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('filters.sort')}</Label>
        <Select
          value={draft.sort || ALL}
          onValueChange={(v) => setDraft({ ...draft, sort: v === ALL ? '' : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map(({ value, key }) => (
              <SelectItem key={value} value={value}>
                {t(key)}
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
  const [industries, setIndustries] = useState<Industry[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    setDraft(draftFromParams(params))
  }, [params])

  useEffect(() => {
    void api
      .get<{ data: Industry[] }>('/industries')
      .then((res) => setIndustries(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
  }, [])

  const activeCount = countActive(draftFromParams(params))

  const apply = (d: Draft = draft) => {
    const next: VacancyListParams = { page: 1 }
    if (params.search) next.search = params.search
    if (d.country) next.country = d.country
    if (d.industry) next.industry = d.industry
    if (d.specialization) next.specialization = d.specialization
    if (d.salaryFrom) next.salaryFrom = Number(d.salaryFrom)
    if (d.salaryTo) next.salaryTo = Number(d.salaryTo)
    if (d.salaryCurrency) next.salaryCurrency = d.salaryCurrency as SalaryCurrencyEnum
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
              {t('filters.title')}
              {activeCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1">{activeCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>{t('filters.title')}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-2">
              <FilterFields draft={draft} setDraft={setDraft} industries={industries} />
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={reset}
                data-testid="filters-reset"
              >
                {t('common.reset')}
              </Button>
              <Button className="flex-1" onClick={() => apply()}>
                {t('filters.apply')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop-панель */}
      <Card className="hidden md:block">
        <CardContent>
          <FilterFields draft={draft} setDraft={setDraft} industries={industries} />
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => apply()}>
              {t('filters.apply')}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} data-testid="filters-reset">
              {t('common.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
