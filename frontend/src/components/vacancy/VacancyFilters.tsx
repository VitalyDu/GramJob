'use client'

import { useState } from 'react'
import type {
  VacancyListParams,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
} from '@/types/api'
import { WORK_FORMAT_LABELS, EMPLOYMENT_TYPE_LABELS, SENIORITY_LABELS } from '@/lib/vacancy-utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  params: VacancyListParams
  onChange: (params: VacancyListParams) => void
}

const SORT_OPTIONS = [
  { value: '', label: 'По умолчанию' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'salary_desc', label: 'Зарплата ↓' },
  { value: 'salary_asc', label: 'Зарплата ↑' },
  { value: 'relevance', label: 'По релевантности' },
] as const

export function VacancyFilters({ params, onChange }: Props) {
  const [search, setSearch] = useState(params.search ?? '')
  const [country, setCountry] = useState(params.country ?? '')
  const [workFormat, setWorkFormat] = useState<WorkFormatEnum | ''>(params.workFormat ?? '')
  const [employmentType, setEmploymentType] = useState<EmploymentTypeEnum | ''>(
    params.employmentType ?? ''
  )
  const [seniority, setSeniority] = useState<SeniorityEnum | ''>(params.seniority ?? '')
  const [sort, setSort] = useState(params.sort ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: VacancyListParams = { page: 1 }
    if (search) next.search = search
    if (country) next.country = country
    if (workFormat) next.workFormat = workFormat
    if (employmentType) next.employmentType = employmentType
    if (seniority) next.seniority = seniority
    if (sort) next.sort = sort as NonNullable<VacancyListParams['sort']>
    onChange(next)
  }

  return (
    <form aria-label="Фильтры вакансий" role="form" onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск вакансий..."
          className="max-w-xs"
        />
        <Input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Страна (RU, US...)"
          className="max-w-[140px]"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          <span>Формат</span>
          <select
            aria-label="Формат работы"
            value={workFormat}
            onChange={(e) => setWorkFormat(e.target.value as WorkFormatEnum | '')}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Все форматы</option>
            {(Object.entries(WORK_FORMAT_LABELS) as [WorkFormatEnum, string][]).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-500">
          <span>Занятость</span>
          <select
            aria-label="Занятость"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentTypeEnum | '')}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Все типы</option>
            {(Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]).map(
              ([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              )
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-500">
          <span>Уровень</span>
          <select
            aria-label="Уровень специалиста"
            value={seniority}
            onChange={(e) => setSeniority(e.target.value as SeniorityEnum | '')}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Все уровни</option>
            {(Object.entries(SENIORITY_LABELS) as [SeniorityEnum, string][]).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-500">
          <span>Сортировка</span>
          <select
            aria-label="Сортировка результатов"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button type="submit">Найти</Button>
    </form>
  )
}
