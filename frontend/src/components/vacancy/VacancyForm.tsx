'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlignLeft, Briefcase, FileText, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { WORK_FORMAT_VALUES, EMPLOYMENT_TYPE_VALUES, SENIORITY_VALUES } from '@/lib/vacancy-utils'
import { CountrySelect } from '@/components/ui/country-select'
import { CitySelect } from '@/components/ui/city-select'
import { LanguagesMultiSelect } from '@/components/ui/languages-multi-select'
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
import { scrollToFirstFormError } from '@/lib/form-utils'

function EnumMultiPills<T extends string>({
  id,
  values,
  selected,
  onChange,
  getLabel,
}: {
  id: string
  values: readonly T[]
  selected: T[]
  onChange: (selected: T[]) => void
  getLabel: (v: T) => string
}) {
  const toggle = (v: T) => {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v))
    } else {
      onChange([...selected, v])
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={id}>
      {values.map((v) => {
        const checked = selected.includes(v)
        return (
          <button
            key={v}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => toggle(v)}
            className={cn(
              'flex h-8 cursor-pointer select-none items-center rounded-full border px-4 text-sm font-medium transition-colors',
              'hover:bg-muted',
              checked
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-transparent text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
            )}
          >
            {getLabel(v)}
          </button>
        )
      })}
    </div>
  )
}

// Static schema for type inference only
const _baseSchema = z.object({
  title: z.string().min(1),
  companyId: z.string().optional().default(''),
  industryId: z.string().min(1),
  specializationId: z.string().min(1),
  workFormat: z.array(z.enum(['office', 'remote', 'hybrid'])).min(1),
  employmentType: z
    .array(z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']))
    .min(1),
  seniority: z.array(z.enum(['intern', 'junior', 'middle', 'senior', 'lead', 'principal'])).min(1),
  country: z.string().min(1),
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
  description: z.string().min(1),
  responsibilities: z.string().min(1),
  requirements: z.string().min(1),
  conditions: z.string().optional().default(''),
  skills: z.string().optional().default(''),
  languages: z.array(z.string()).optional().default([]),
  experienceYears: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().int().nonnegative().optional()
  ),
})

type FormData = z.infer<typeof _baseSchema>

interface Props {
  myCompanies: Company[]
  defaultValues?: Partial<VacancyCreateInput>
  isLoading?: boolean
  onSubmit: (data: VacancyCreateInput) => void | Promise<void>
}

export function VacancyForm({ myCompanies, defaultValues, isLoading, onSubmit }: Props) {
  const { t } = useTranslation()
  const [industries, setIndustries] = useState<Industry[]>([])
  const [specializations, setSpecializations] = useState<Specialization[]>([])

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t('forms.vacancy.titleRequired')),
        companyId: z.string().optional().default(''),
        industryId: z.string().min(1, t('forms.vacancy.industryRequired')),
        specializationId: z.string().min(1, t('forms.vacancy.specializationRequired')),
        workFormat: z.array(z.enum(['office', 'remote', 'hybrid'])).min(1),
        employmentType: z
          .array(z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']))
          .min(1),
        seniority: z
          .array(z.enum(['intern', 'junior', 'middle', 'senior', 'lead', 'principal']))
          .min(1),
        country: z.string().min(1, t('forms.vacancy.countryRequired')),
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
        description: z.string().min(1, t('forms.vacancy.descriptionRequired')),
        responsibilities: z.string().min(1, t('forms.vacancy.responsibilitiesRequired')),
        requirements: z.string().min(1, t('forms.vacancy.requirementsRequired')),
        conditions: z.string().optional().default(''),
        skills: z.string().optional().default(''),
        languages: z.array(z.string()).optional().default([]),
        experienceYears: z.preprocess(
          (v) => (v === '' || v === undefined ? undefined : Number(v)),
          z.number().int().nonnegative().optional()
        ),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      companyId: defaultValues?.companyId ?? myCompanies[0]?.documentId ?? '',
      industryId: defaultValues?.industryId ?? '',
      specializationId: defaultValues?.specializationId ?? '',
      workFormat: (defaultValues?.workFormat as WorkFormatEnum[]) ?? ['remote'],
      employmentType: (defaultValues?.employmentType as EmploymentTypeEnum[]) ?? ['full-time'],
      seniority: (defaultValues?.seniority as SeniorityEnum[]) ?? ['middle'],
      country: defaultValues?.country ?? 'RU',
      city: defaultValues?.city ?? '',
      ...(defaultValues?.salaryFrom !== undefined ? { salaryFrom: defaultValues.salaryFrom } : {}),
      ...(defaultValues?.salaryTo !== undefined ? { salaryTo: defaultValues.salaryTo } : {}),
      salaryCurrency: (defaultValues?.salaryCurrency as SalaryCurrencyEnum) ?? 'RUB',
      description: defaultValues?.description ?? '',
      responsibilities: defaultValues?.responsibilities ?? '',
      requirements: defaultValues?.requirements ?? '',
      conditions: defaultValues?.conditions ?? '',
      skills: defaultValues?.skills?.join(', ') ?? '',
      languages: defaultValues?.languages ?? [],
      ...(defaultValues?.experienceYears !== undefined
        ? { experienceYears: defaultValues.experienceYears }
        : {}),
    },
  })

  const selectedIndustry = watch('industryId')
  const selectedCountry = useWatch({ control, name: 'country' })
  useEffect(() => {
    setValue('city', '')
  }, [selectedCountry, setValue])

  useEffect(() => {
    void api
      .get<{ data: Industry[] }>('/industries')
      .then((res) => setIndustries(res.data))
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
      ...(data.companyId ? { companyId: data.companyId } : {}),
      ...(data.city ? { city: data.city } : {}),
      ...(data.salaryFrom !== undefined ? { salaryFrom: data.salaryFrom } : {}),
      ...(data.salaryTo !== undefined ? { salaryTo: data.salaryTo } : {}),
      ...(data.salaryCurrency ? { salaryCurrency: data.salaryCurrency } : {}),
      ...(data.conditions ? { conditions: data.conditions } : {}),
      ...(skills?.length ? { skills } : {}),
      ...(data.languages?.length ? { languages: data.languages } : {}),
      ...(data.experienceYears !== undefined ? { experienceYears: data.experienceYears } : {}),
    }
    void onSubmit(input)
  }

  const isEditMode = defaultValues !== undefined
  const submitLabel = isEditMode ? t('forms.vacancy.submitEdit') : t('forms.vacancy.submitCreate')

  const mainButtonActive = useTelegramMainButton({
    text: isLoading ? t('forms.vacancy.saving') : submitLabel,
    onClick: () => void handleSubmit(handleFormSubmit, scrollToFirstFormError)(),
    disabled: !!isLoading,
  })

  return (
    <form onSubmit={handleSubmit(handleFormSubmit, scrollToFirstFormError)} className="space-y-5">
      {/* Секция: Основное */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {t('forms.vacancy.sectionMain')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="title">{t('forms.vacancy.titleLabel')} *</FieldLabel>
            <Input id="title" {...register('title')} placeholder="Frontend Developer" />
            {errors.title && <FieldError errors={[errors.title]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="companyId">{t('forms.vacancy.companyLabel')}</FieldLabel>
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="companyId" className="w-full">
                    <SelectValue placeholder={t('forms.vacancy.noCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('forms.vacancy.noCompany')}</SelectItem>
                    {myCompanies
                      .filter((c) => c.moderationStatus === 'published')
                      .map((c) => (
                        <SelectItem key={c.documentId} value={c.documentId}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="industryId">{t('forms.vacancy.industryLabel')} *</FieldLabel>
            <Controller
              control={control}
              name="industryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="industryId" className="w-full">
                    <SelectValue placeholder={t('forms.vacancy.industryPlaceholder')} />
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
            {errors.industryId && <FieldError errors={[errors.industryId]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="specializationId">
              {t('forms.vacancy.specializationLabel')} *
            </FieldLabel>
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
                    <SelectValue placeholder={t('forms.vacancy.specializationPlaceholder')} />
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
            {errors.specializationId && <FieldError errors={[errors.specializationId]} />}
          </Field>
        </CardContent>
      </Card>

      {/* Секция: Условия */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            {t('forms.vacancy.sectionConditions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field>
            <FieldLabel>{t('forms.vacancy.workFormatLabel')} *</FieldLabel>
            <Controller
              control={control}
              name="workFormat"
              render={({ field }) => (
                <EnumMultiPills
                  id="workFormat"
                  values={WORK_FORMAT_VALUES as readonly WorkFormatEnum[]}
                  selected={field.value}
                  onChange={field.onChange}
                  getLabel={(v) => t(`enums.workFormat.${v}`)}
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel>{t('forms.vacancy.employmentLabel')} *</FieldLabel>
            <Controller
              control={control}
              name="employmentType"
              render={({ field }) => (
                <EnumMultiPills
                  id="employmentType"
                  values={EMPLOYMENT_TYPE_VALUES as readonly EmploymentTypeEnum[]}
                  selected={field.value}
                  onChange={field.onChange}
                  getLabel={(v) => t(`enums.employmentType.${v}`)}
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel>{t('forms.vacancy.seniorityLabel')} *</FieldLabel>
            <Controller
              control={control}
              name="seniority"
              render={({ field }) => (
                <EnumMultiPills
                  id="seniority"
                  values={SENIORITY_VALUES as readonly SeniorityEnum[]}
                  selected={field.value}
                  onChange={field.onChange}
                  getLabel={(v) => t(`enums.seniority.${v}`)}
                />
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t('forms.vacancy.countryLabel')} *</FieldLabel>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <CountrySelect value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.country && <FieldError errors={[errors.country]} />}
            </Field>
            <Field>
              <FieldLabel>{t('forms.vacancy.cityLabel')}</FieldLabel>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <CitySelect
                    country={selectedCountry}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="salaryFrom">{t('forms.vacancy.salaryFromLabel')}</FieldLabel>
              <Input
                id="salaryFrom"
                type="number"
                {...register('salaryFrom')}
                placeholder="100000"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="salaryTo">{t('forms.vacancy.salaryToLabel')}</FieldLabel>
              <Input id="salaryTo" type="number" {...register('salaryTo')} placeholder="200000" />
            </Field>
            <Field>
              <FieldLabel htmlFor="salaryCurrency">{t('forms.vacancy.currencyLabel')}</FieldLabel>
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
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Секция: Описание */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlignLeft className="h-4 w-4 text-muted-foreground" />
            {t('forms.vacancy.sectionDescription')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="description">{t('forms.vacancy.descriptionLabel')} *</FieldLabel>
            <Textarea
              id="description"
              {...register('description')}
              rows={4}
              placeholder={t('forms.vacancy.descriptionPlaceholder')}
            />
            {errors.description && <FieldError errors={[errors.description]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="responsibilities">
              {t('forms.vacancy.responsibilitiesLabel')} *
            </FieldLabel>
            <Textarea
              id="responsibilities"
              {...register('responsibilities')}
              rows={4}
              placeholder={t('forms.vacancy.responsibilitiesPlaceholder')}
            />
            {errors.responsibilities && <FieldError errors={[errors.responsibilities]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="requirements">{t('forms.vacancy.requirementsLabel')} *</FieldLabel>
            <Textarea
              id="requirements"
              {...register('requirements')}
              rows={4}
              placeholder={t('forms.vacancy.requirementsPlaceholder')}
            />
            {errors.requirements && <FieldError errors={[errors.requirements]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="conditions">{t('forms.vacancy.conditionsLabel')}</FieldLabel>
            <Textarea
              id="conditions"
              {...register('conditions')}
              rows={3}
              placeholder={t('forms.vacancy.conditionsPlaceholder')}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Секция: Дополнительно */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            {t('forms.vacancy.sectionExtra')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="skills">{t('forms.vacancy.skillsLabel')}</FieldLabel>
            <Input id="skills" {...register('skills')} placeholder="React, TypeScript, Node.js" />
          </Field>

          <Field>
            <FieldLabel>{t('forms.vacancy.languagesLabel')}</FieldLabel>
            <Controller
              control={control}
              name="languages"
              render={({ field }) => (
                <LanguagesMultiSelect value={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="experienceYears">{t('forms.vacancy.experienceLabel')}</FieldLabel>
            <Input
              id="experienceYears"
              type="number"
              {...register('experienceYears')}
              placeholder="3"
            />
          </Field>
        </CardContent>
      </Card>

      {!mainButtonActive && (
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('forms.vacancy.saving') : submitLabel}
        </Button>
      )}
    </form>
  )
}
