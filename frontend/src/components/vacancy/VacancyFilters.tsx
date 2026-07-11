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
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { CountrySelect } from '@/components/ui/country-select'
import { CitySelect } from '@/components/ui/city-select'

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
  city: string
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
    city: params.city ?? '',
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
    draft.city,
    draft.industry,
    draft.specialization,
    draft.salaryFrom,
    draft.salaryTo,
    ...draft.workFormat,
    ...draft.employmentType,
    ...draft.seniority,
  ].filter(Boolean).length
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="flex items-center gap-2">
      {label}
      {count > 0 && (
        <Badge variant="secondary" className="h-4.5 min-w-4.5 px-1 text-[10px] leading-none">
          {count}
        </Badge>
      )}
    </span>
  )
}

function CheckboxList<T extends string>({
  prefix,
  values,
  selected,
  getLabel,
  onChange,
}: {
  prefix: string
  values: readonly T[]
  selected: T[]
  getLabel: (v: T) => string
  onChange: (v: T[]) => void
}) {
  return (
    <div className="space-y-2.5">
      {values.map((v) => (
        <div key={v} className="flex items-center gap-2.5">
          <Checkbox
            id={`${prefix}-${v}`}
            checked={selected.includes(v)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, v] : selected.filter((x) => x !== v))
            }
          />
          <label
            htmlFor={`${prefix}-${v}`}
            className="cursor-pointer text-sm leading-none select-none"
          >
            {getLabel(v)}
          </label>
        </div>
      ))}
    </div>
  )
}

const DEFAULT_OPEN = ['location', 'category', 'format', 'employment', 'seniority']

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
    <div>
      {/* Sort — always visible */}
      <div className="px-1 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('filters.sort')}
        </p>
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

      <Accordion type="multiple" defaultValue={DEFAULT_OPEN}>
        {/* Location */}
        <AccordionItem value="location">
          <AccordionTrigger className="px-1 py-3 text-sm hover:no-underline">
            <SectionLabel
              label={t('filters.location')}
              count={(draft.country ? 1 : 0) + (draft.city ? 1 : 0)}
            />
          </AccordionTrigger>
          <AccordionContent className="space-y-2 px-1 pb-3">
            <CountrySelect
              value={draft.country}
              onChange={(v) => setDraft({ ...draft, country: v, city: '' })}
              placeholder={t('filters.anyCountry')}
            />
            <CitySelect
              country={draft.country}
              value={draft.city}
              onChange={(v) => setDraft({ ...draft, city: v })}
              placeholder={t('filters.anyCity')}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Category */}
        <AccordionItem value="category">
          <AccordionTrigger className="px-1 py-3 text-sm hover:no-underline">
            <SectionLabel
              label={t('filters.industry')}
              count={(draft.industry ? 1 : 0) + (draft.specialization ? 1 : 0)}
            />
          </AccordionTrigger>
          <AccordionContent className="space-y-2 px-1 pb-3">
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
                {(
                  industries.find((i) => i.documentId === draft.industry)?.specializations ?? []
                ).map((spec) => (
                  <SelectItem key={spec.documentId} value={spec.documentId}>
                    {spec.name[lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* Salary */}
        <AccordionItem value="salary">
          <AccordionTrigger className="px-1 py-3 text-sm hover:no-underline">
            <SectionLabel
              label={t('filters.salary')}
              count={
                [draft.salaryFrom, draft.salaryTo, draft.salaryCurrency].filter(Boolean).length
              }
            />
          </AccordionTrigger>
          <AccordionContent className="space-y-2 px-1 pb-3">
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
          </AccordionContent>
        </AccordionItem>

        {/* Work Format */}
        <AccordionItem value="format">
          <AccordionTrigger className="px-1 py-3 text-sm hover:no-underline">
            <SectionLabel label={t('filters.workFormat')} count={draft.workFormat.length} />
          </AccordionTrigger>
          <AccordionContent className="px-1 pb-3">
            <CheckboxList
              prefix="wf"
              values={WORK_FORMAT_VALUES as readonly WorkFormatEnum[]}
              selected={draft.workFormat}
              getLabel={(v) => t(`enums.workFormat.${v}`)}
              onChange={(v) => setDraft({ ...draft, workFormat: v })}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Employment Type */}
        <AccordionItem value="employment">
          <AccordionTrigger className="px-1 py-3 text-sm hover:no-underline">
            <SectionLabel label={t('filters.employment')} count={draft.employmentType.length} />
          </AccordionTrigger>
          <AccordionContent className="px-1 pb-3">
            <CheckboxList
              prefix="et"
              values={EMPLOYMENT_TYPE_VALUES as readonly EmploymentTypeEnum[]}
              selected={draft.employmentType}
              getLabel={(v) => t(`enums.employmentType.${v}`)}
              onChange={(v) => setDraft({ ...draft, employmentType: v })}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Seniority */}
        <AccordionItem value="seniority">
          <AccordionTrigger className="px-1 py-3 text-sm hover:no-underline">
            <SectionLabel label={t('filters.seniority')} count={draft.seniority.length} />
          </AccordionTrigger>
          <AccordionContent className="px-1 pb-3">
            <CheckboxList
              prefix="sn"
              values={SENIORITY_VALUES as readonly SeniorityEnum[]}
              selected={draft.seniority}
              getLabel={(v) => t(`enums.seniority.${v}`)}
              onChange={(v) => setDraft({ ...draft, seniority: v })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
    if (d.city) next.city = d.city
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
      {/* Mobile */}
      <div className="mb-3 md:hidden">
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen} direction="bottom">
          <DrawerTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              {t('filters.title')}
              {activeCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1">{activeCount}</Badge>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('filters.title')}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4">
              <FilterFields draft={draft} setDraft={setDraft} industries={industries} />
            </div>
            <DrawerFooter>
              <Button onClick={() => apply()}>{t('filters.apply')}</Button>
              <Button variant="ghost" onClick={reset} data-testid="filters-reset">
                {t('common.reset')}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Desktop */}
      <Card className="hidden overflow-hidden md:block">
        <div className="px-4">
          <FilterFields draft={draft} setDraft={setDraft} industries={industries} />
        </div>
        <div className="flex flex-col gap-2 border-t p-3">
          <Button size="sm" className="w-full" onClick={() => apply()}>
            {t('filters.apply')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={reset}
            data-testid="filters-reset"
          >
            {t('common.reset')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
