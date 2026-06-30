'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WORK_FORMAT_LABELS, EMPLOYMENT_TYPE_LABELS, SENIORITY_LABELS } from '@/lib/vacancy-utils'
import type {
  VacancyCreateInput,
  Industry,
  Specialization,
  Company,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
  SalaryCurrencyEnum,
} from '@/types/api'
import { api } from '@/services/api'

const schema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  companyId: z.string().optional().default(''),
  industryId: z.string().min(1, 'Отрасль обязательна'),
  specializationId: z.string().min(1, 'Специализация обязательна'),
  workFormat: z.enum(['office', 'remote', 'hybrid']),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']),
  seniority: z.enum(['intern', 'junior', 'middle', 'senior', 'lead', 'principal']),
  country: z.string().min(1, 'Страна обязательна'),
  city: z.string().optional().default(''),
  salaryFrom: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  salaryTo: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  salaryCurrency: z.enum(['USD', 'EUR', 'RUB', 'GBP']).optional(),
  description: z.string().min(1, 'Описание обязательно'),
  responsibilities: z.string().min(1, 'Обязанности обязательны'),
  requirements: z.string().min(1, 'Требования обязательны'),
  conditions: z.string().optional().default(''),
  skills: z.string().optional().default(''),
  languages: z.string().optional().default(''),
  experienceYears: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().int().nonnegative().optional()
  ),
  urgent: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

interface Props {
  myCompanies: Company[]
  defaultValues?: Partial<VacancyCreateInput>
  isLoading?: boolean
  onSubmit: (data: VacancyCreateInput) => void | Promise<void>
}

export function VacancyForm({ myCompanies, defaultValues, isLoading, onSubmit }: Props) {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [specializations, setSpecializations] = useState<Specialization[]>([])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      companyId: defaultValues?.companyId ?? myCompanies[0]?.documentId ?? '',
      industryId: defaultValues?.industryId ?? '',
      specializationId: defaultValues?.specializationId ?? '',
      workFormat: (defaultValues?.workFormat as WorkFormatEnum) ?? 'remote',
      employmentType: (defaultValues?.employmentType as EmploymentTypeEnum) ?? 'full-time',
      seniority: (defaultValues?.seniority as SeniorityEnum) ?? 'middle',
      country: defaultValues?.country ?? 'RU',
      city: defaultValues?.city ?? '',
      salaryFrom: defaultValues?.salaryFrom,
      salaryTo: defaultValues?.salaryTo,
      salaryCurrency: (defaultValues?.salaryCurrency as SalaryCurrencyEnum) ?? 'RUB',
      description: defaultValues?.description ?? '',
      responsibilities: defaultValues?.responsibilities ?? '',
      requirements: defaultValues?.requirements ?? '',
      conditions: defaultValues?.conditions ?? '',
      skills: defaultValues?.skills?.join(', ') ?? '',
      languages: defaultValues?.languages?.join(', ') ?? '',
      experienceYears: defaultValues?.experienceYears,
      urgent: defaultValues?.urgent ?? false,
    },
  })

  const selectedIndustry = watch('industryId')

  useEffect(() => {
    void api
      .get<Industry[]>('/industries')
      .then((res) => setIndustries(res))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const ind = industries.find((i) => i.documentId === selectedIndustry)
    setSpecializations(ind?.specializations ?? [])
  }, [selectedIndustry, industries])

  const handleFormSubmit = (data: FormData) => {
    const skills = data.skills
      ? data.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined
    const languages = data.languages
      ? data.languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined

    const input: VacancyCreateInput = {
      title: data.title,
      industryId: data.industryId,
      specializationId: data.specializationId,
      workFormat: data.workFormat,
      employmentType: data.employmentType,
      seniority: data.seniority,
      country: data.country,
      description: data.description,
      responsibilities: data.responsibilities,
      requirements: data.requirements,
      urgent: data.urgent,
      ...(data.companyId ? { companyId: data.companyId } : {}),
      ...(data.city ? { city: data.city } : {}),
      ...(data.salaryFrom !== undefined ? { salaryFrom: data.salaryFrom } : {}),
      ...(data.salaryTo !== undefined ? { salaryTo: data.salaryTo } : {}),
      ...(data.salaryCurrency ? { salaryCurrency: data.salaryCurrency } : {}),
      ...(data.conditions ? { conditions: data.conditions } : {}),
      ...(skills?.length ? { skills } : {}),
      ...(languages?.length ? { languages } : {}),
      ...(data.experienceYears !== undefined ? { experienceYears: data.experienceYears } : {}),
    }
    void onSubmit(input)
  }

  const textareaClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  const selectClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Название */}
      <div className="space-y-1">
        <Label htmlFor="title">Название вакансии *</Label>
        <Input id="title" {...register('title')} placeholder="Frontend Developer" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Компания */}
      <div className="space-y-1">
        <Label htmlFor="companyId">Компания</Label>
        <select id="companyId" {...register('companyId')} className={selectClass}>
          <option value="">Без компании (фриланс)</option>
          {myCompanies
            .filter((c) => c.status === 'published')
            .map((c) => (
              <option key={c.documentId} value={c.documentId}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {/* Отрасль */}
      <div className="space-y-1">
        <Label htmlFor="industryId">Отрасль *</Label>
        <select id="industryId" {...register('industryId')} className={selectClass}>
          <option value="">Выберите отрасль</option>
          {industries.map((i) => (
            <option key={i.documentId} value={i.documentId}>
              {i.name.ru}
            </option>
          ))}
        </select>
        {errors.industryId && (
          <p className="text-xs text-destructive">{errors.industryId.message}</p>
        )}
      </div>

      {/* Специализация */}
      <div className="space-y-1">
        <Label htmlFor="specializationId">Специализация *</Label>
        <select
          id="specializationId"
          {...register('specializationId')}
          className={selectClass}
          disabled={!selectedIndustry}
        >
          <option value="">Выберите специализацию</option>
          {specializations.map((s) => (
            <option key={s.documentId} value={s.documentId}>
              {s.name.ru}
            </option>
          ))}
        </select>
        {errors.specializationId && (
          <p className="text-xs text-destructive">{errors.specializationId.message}</p>
        )}
      </div>

      {/* Формат / Занятость / Уровень */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="workFormat">Формат *</Label>
          <select id="workFormat" {...register('workFormat')} className={selectClass}>
            {(Object.entries(WORK_FORMAT_LABELS) as [WorkFormatEnum, string][]).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="employmentType">Занятость *</Label>
          <select id="employmentType" {...register('employmentType')} className={selectClass}>
            {(Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]).map(
              ([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              )
            )}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="seniority">Уровень *</Label>
          <select id="seniority" {...register('seniority')} className={selectClass}>
            {(Object.entries(SENIORITY_LABELS) as [SeniorityEnum, string][]).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Страна / Город */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="country">Страна *</Label>
          <Input id="country" {...register('country')} placeholder="RU" />
          {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="city">Город</Label>
          <Input id="city" {...register('city')} placeholder="Москва" />
        </div>
      </div>

      {/* Зарплата */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="salaryFrom">Зарплата от</Label>
          <Input id="salaryFrom" type="number" {...register('salaryFrom')} placeholder="100000" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="salaryTo">До</Label>
          <Input id="salaryTo" type="number" {...register('salaryTo')} placeholder="200000" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="salaryCurrency">Валюта</Label>
          <select id="salaryCurrency" {...register('salaryCurrency')} className={selectClass}>
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
      </div>

      {/* Описание */}
      <div className="space-y-1">
        <Label htmlFor="description">Описание *</Label>
        <textarea
          id="description"
          {...register('description')}
          className={textareaClass}
          rows={4}
          placeholder="Чем занимается компания, над чем предстоит работать..."
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Обязанности */}
      <div className="space-y-1">
        <Label htmlFor="responsibilities">Обязанности *</Label>
        <textarea
          id="responsibilities"
          {...register('responsibilities')}
          className={textareaClass}
          rows={4}
          placeholder="- Разработка..."
        />
        {errors.responsibilities && (
          <p className="text-xs text-destructive">{errors.responsibilities.message}</p>
        )}
      </div>

      {/* Требования */}
      <div className="space-y-1">
        <Label htmlFor="requirements">Требования *</Label>
        <textarea
          id="requirements"
          {...register('requirements')}
          className={textareaClass}
          rows={4}
          placeholder="- Опыт от 3 лет..."
        />
        {errors.requirements && (
          <p className="text-xs text-destructive">{errors.requirements.message}</p>
        )}
      </div>

      {/* Условия */}
      <div className="space-y-1">
        <Label htmlFor="conditions">Условия</Label>
        <textarea
          id="conditions"
          {...register('conditions')}
          className={textareaClass}
          rows={3}
          placeholder="- ДМС, удалёнка..."
        />
      </div>

      {/* Навыки */}
      <div className="space-y-1">
        <Label htmlFor="skills">Навыки (через запятую)</Label>
        <Input id="skills" {...register('skills')} placeholder="React, TypeScript, Node.js" />
      </div>

      {/* Языки */}
      <div className="space-y-1">
        <Label htmlFor="languages">Языки (через запятую)</Label>
        <Input id="languages" {...register('languages')} placeholder="Русский, English" />
      </div>

      {/* Опыт / Срочно */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="experienceYears">Опыт (лет)</Label>
          <Input
            id="experienceYears"
            type="number"
            {...register('experienceYears')}
            placeholder="3"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" {...register('urgent')} className="h-4 w-4" />
            <span className="text-sm text-gray-700">🔥 Срочная вакансия</span>
          </label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </form>
  )
}
