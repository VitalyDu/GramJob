'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { WORK_FORMAT_LABELS, EMPLOYMENT_TYPE_LABELS, SENIORITY_LABELS } from '@/lib/vacancy-utils'
import { CountrySelect } from '@/components/ui/country-select'
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
import { useTelegramMainButton } from '@/hooks/useTelegramMainButton'

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
    control,
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

  const isEditMode = defaultValues !== undefined
  const submitLabel = isEditMode ? 'Сохранить и отправить на модерацию' : 'Отправить на модерацию'

  const mainButtonActive = useTelegramMainButton({
    text: isLoading ? 'Сохранение...' : submitLabel,
    onClick: () => void handleSubmit(handleFormSubmit)(),
    disabled: !!isLoading,
  })

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Секция: Основное */}
      <Card>
        <CardHeader>
          <CardTitle>Основное</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Название вакансии *</Label>
            <Input id="title" {...register('title')} placeholder="Frontend Developer" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyId">Компания</Label>
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="companyId" className="w-full">
                    <SelectValue placeholder="Без компании (фриланс)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без компании (фриланс)</SelectItem>
                    {myCompanies
                      .filter((c) => c.status === 'published')
                      .map((c) => (
                        <SelectItem key={c.documentId} value={c.documentId}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industryId">Отрасль *</Label>
            <Controller
              control={control}
              name="industryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="industryId" className="w-full">
                    <SelectValue placeholder="Выберите отрасль" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i.documentId} value={i.documentId}>
                        {i.name.ru}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.industryId && (
              <p className="text-sm text-destructive">{errors.industryId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specializationId">Специализация *</Label>
            <Controller
              control={control}
              name="specializationId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!selectedIndustry}
                >
                  <SelectTrigger id="specializationId" className="w-full">
                    <SelectValue placeholder="Выберите специализацию" />
                  </SelectTrigger>
                  <SelectContent>
                    {specializations.map((s) => (
                      <SelectItem key={s.documentId} value={s.documentId}>
                        {s.name.ru}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.specializationId && (
              <p className="text-sm text-destructive">{errors.specializationId.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Секция: Условия */}
      <Card>
        <CardHeader>
          <CardTitle>Условия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="employmentType">Занятость *</Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="employmentType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]
                      ).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workFormat">Формат *</Label>
              <Controller
                control={control}
                name="workFormat"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="workFormat" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(WORK_FORMAT_LABELS) as [WorkFormatEnum, string][]).map(
                        ([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seniority">Уровень *</Label>
              <Controller
                control={control}
                name="seniority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="seniority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(SENIORITY_LABELS) as [SeniorityEnum, string][]).map(
                        ([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Страна *</Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <CountrySelect value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Город</Label>
              <Input id="city" {...register('city')} placeholder="Москва" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="salaryFrom">Зарплата от</Label>
              <Input
                id="salaryFrom"
                type="number"
                {...register('salaryFrom')}
                placeholder="100000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salaryTo">До</Label>
              <Input id="salaryTo" type="number" {...register('salaryTo')} placeholder="200000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salaryCurrency">Валюта</Label>
              <Controller
                control={control}
                name="salaryCurrency"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="salaryCurrency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RUB">₽ RUB</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
                      <SelectItem value="GBP">£ GBP</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Секция: Описание */}
      <Card>
        <CardHeader>
          <CardTitle>Описание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="description">Описание *</Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={4}
              placeholder="Чем занимается компания, над чем предстоит работать..."
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="responsibilities">Обязанности *</Label>
            <Textarea
              id="responsibilities"
              {...register('responsibilities')}
              rows={4}
              placeholder="- Разработка..."
            />
            {errors.responsibilities && (
              <p className="text-sm text-destructive">{errors.responsibilities.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="requirements">Требования *</Label>
            <Textarea
              id="requirements"
              {...register('requirements')}
              rows={4}
              placeholder="- Опыт от 3 лет..."
            />
            {errors.requirements && (
              <p className="text-sm text-destructive">{errors.requirements.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conditions">Условия</Label>
            <Textarea
              id="conditions"
              {...register('conditions')}
              rows={3}
              placeholder="- ДМС, удалёнка..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Секция: Дополнительно */}
      <Card>
        <CardHeader>
          <CardTitle>Дополнительно</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="skills">Навыки (через запятую)</Label>
            <Input id="skills" {...register('skills')} placeholder="React, TypeScript, Node.js" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="languages">Языки (через запятую)</Label>
            <Input id="languages" {...register('languages')} placeholder="Русский, English" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
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
                <span className="text-sm text-foreground">🔥 Срочная вакансия</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {!mainButtonActive && (
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : submitLabel}
        </Button>
      )}
    </form>
  )
}
