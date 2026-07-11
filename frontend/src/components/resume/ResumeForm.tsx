'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFieldArray, useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlignLeft,
  Briefcase,
  CalendarIcon,
  GraduationCap,
  Globe,
  Phone,
  Target,
  Trash2,
  User,
} from 'lucide-react'
import { format, parse, isValid, type Locale } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { RESUME_WORK_FORMAT_VALUES, RESUME_EMPLOYMENT_TYPE_VALUES } from '@/lib/resume-utils'
import { CountrySelect } from '@/components/ui/country-select'
import { CitySelect } from '@/components/ui/city-select'
import type { ResumeCreateInput, ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'
import { useTelegramMainButton } from '@/hooks/useTelegramMainButton'

function EnumPills<T extends string>({
  id,
  values,
  value,
  onChange,
  getLabel,
}: {
  id: string
  values: readonly T[]
  value: T
  onChange: (v: T) => void
  getLabel: (v: T) => string
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className="flex flex-wrap gap-1.5"
    >
      {values.map((v) => (
        <div key={v} className="flex">
          <RadioGroupItem value={v} id={`${id}-${v}`} className="peer sr-only" />
          <Label
            htmlFor={`${id}-${v}`}
            className={cn(
              'flex h-8 cursor-pointer select-none items-center rounded-full border px-4 text-sm font-medium transition-colors',
              'hover:bg-muted',
              'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1'
            )}
          >
            {getLabel(v)}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}

function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  locale,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  locale?: Locale
}) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => {
    if (!value) return undefined
    const d = parse(value, 'yyyy-MM-dd', new Date())
    return isValid(d) ? d : undefined
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? format(selected, 'dd.MM.yyyy') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          captionLayout="dropdown"
          startMonth={new Date(1950, 0)}
          endMonth={new Date(new Date().getFullYear() + 1, 11)}
          locale={locale}
          defaultMonth={selected ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}

// Static schemas for type inference only
const _baseWorkExperienceSchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional().default(''),
  current: z.boolean().default(false),
  description: z.string().optional().default(''),
})

const _baseEducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional().default(''),
  current: z.boolean().default(false),
})

const _baseLanguageSchema = z.object({
  lang: z.string().default(''),
  level: z.string().default(''),
})

const _baseSchema = z.object({
  title: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  city: z.string().optional().default(''),
  desiredSalary: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  currency: z.enum(['USD', 'EUR', 'RUB', 'GBP']).optional(),
  workFormat: z.enum(['office', 'remote', 'hybrid', 'any']),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']),
  experienceYears: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().int().nonnegative().optional()
  ),
  about: z.string().optional().default(''),
  skills: z.string().optional().default(''),
  contactTelegram: z.string().optional().default(''),
  contactEmail: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  workExperience: z.array(_baseWorkExperienceSchema).default([]),
  education: z.array(_baseEducationSchema).default([]),
  languages: z.array(_baseLanguageSchema).default([]),
})

type FormData = z.infer<typeof _baseSchema>

interface Props {
  defaultValues?: Partial<ResumeCreateInput>
  isLoading?: boolean
  onSubmit: (data: ResumeCreateInput) => void | Promise<void>
}

export function ResumeForm({ defaultValues, isLoading, onSubmit }: Props) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'en' ? enUS : ru

  const workExperienceSchema = useMemo(
    () =>
      z.object({
        company: z.string().min(1, t('forms.resume.companyRequired')),
        position: z.string().min(1, t('forms.resume.positionRequired')),
        startDate: z.string().min(1, t('forms.resume.startDateRequired')),
        endDate: z.string().optional().default(''),
        current: z.boolean().default(false),
        description: z.string().optional().default(''),
      }),
    [t]
  )

  const educationSchema = useMemo(
    () =>
      z.object({
        institution: z.string().min(1, t('forms.resume.institutionRequired')),
        degree: z.string().min(1, t('forms.resume.degreeRequired')),
        field: z.string().min(1, t('forms.resume.fieldRequired')),
        startDate: z.string().min(1, t('forms.resume.startDateRequired')),
        endDate: z.string().optional().default(''),
        current: z.boolean().default(false),
      }),
    [t]
  )

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t('forms.resume.titleRequired')),
        firstName: z.string().min(1, t('forms.resume.firstNameRequired')),
        lastName: z.string().min(1, t('forms.resume.lastNameRequired')),
        country: z.string().min(1, t('forms.resume.countryRequired')),
        city: z.string().optional().default(''),
        desiredSalary: z.preprocess(
          (v) => (v === '' || v === undefined ? undefined : Number(v)),
          z.number().positive().optional()
        ),
        currency: z.enum(['USD', 'EUR', 'RUB', 'GBP']).optional(),
        workFormat: z.enum(['office', 'remote', 'hybrid', 'any']),
        employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']),
        experienceYears: z.preprocess(
          (v) => (v === '' || v === undefined ? undefined : Number(v)),
          z.number().int().nonnegative().optional()
        ),
        about: z.string().optional().default(''),
        skills: z.string().optional().default(''),
        contactTelegram: z.string().optional().default(''),
        contactEmail: z.string().optional().default(''),
        contactPhone: z.string().optional().default(''),
        workExperience: z.array(workExperienceSchema).default([]),
        education: z.array(educationSchema).default([]),
        languages: z.array(_baseLanguageSchema).default([]),
      }),
    [t, workExperienceSchema, educationSchema]
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
      firstName: defaultValues?.firstName ?? '',
      lastName: defaultValues?.lastName ?? '',
      country: defaultValues?.country ?? '',
      city: defaultValues?.city ?? '',
      ...(defaultValues?.desiredSalary !== undefined
        ? { desiredSalary: defaultValues.desiredSalary }
        : {}),
      currency: defaultValues?.currency ?? 'USD',
      workFormat: (defaultValues?.workFormat as ResumeWorkFormatEnum) ?? 'remote',
      employmentType: (defaultValues?.employmentType as EmploymentTypeEnum) ?? 'full-time',
      ...(defaultValues?.experienceYears !== undefined
        ? { experienceYears: defaultValues.experienceYears }
        : {}),
      about: defaultValues?.about ?? '',
      skills: defaultValues?.skills?.join(', ') ?? '',
      contactTelegram: defaultValues?.contacts?.telegram ?? '',
      contactEmail: defaultValues?.contacts?.email ?? '',
      contactPhone: defaultValues?.contacts?.phone ?? '',
      workExperience: (defaultValues?.workExperience ?? []).map((w) => ({
        company: w.company,
        position: w.position,
        startDate: w.startDate,
        endDate: w.endDate != null ? w.endDate : '',
        current: w.current ?? false,
        description: w.description != null ? w.description : '',
      })),
      education: (defaultValues?.education ?? []).map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startDate: e.startDate,
        endDate: e.endDate != null ? e.endDate : '',
        current: e.current ?? false,
      })),
      languages: (defaultValues?.languages ?? []).map((l) => ({
        lang: l.lang,
        level: l.level,
      })),
    },
  })

  const selectedCountry = useWatch({ control, name: 'country' })
  useEffect(() => {
    setValue('city', '')
  }, [selectedCountry, setValue])

  const {
    fields: workFields,
    append: appendWork,
    remove: removeWork,
  } = useFieldArray({ control, name: 'workExperience' })

  const {
    fields: eduFields,
    append: appendEdu,
    remove: removeEdu,
  } = useFieldArray({ control, name: 'education' })

  const {
    fields: langFields,
    append: appendLang,
    remove: removeLang,
  } = useFieldArray({ control, name: 'languages' })

  const handleFormSubmit = (data: FormData) => {
    const filledLanguages = data.languages
      .map((l) => ({ lang: l.lang.trim(), level: l.level.trim() }))
      .filter((l) => l.lang !== '')
    const payload = {
      title: data.title,
      firstName: data.firstName,
      lastName: data.lastName,
      country: data.country,
      city: data.city || undefined,
      desiredSalary: data.desiredSalary,
      currency: data.currency,
      workFormat: data.workFormat,
      employmentType: data.employmentType,
      experienceYears: data.experienceYears,
      about: data.about || undefined,
      skills: data.skills
        ? data.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      contacts: {
        ...(data.contactTelegram ? { telegram: data.contactTelegram } : {}),
        ...(data.contactEmail ? { email: data.contactEmail } : {}),
        ...(data.contactPhone ? { phone: data.contactPhone } : {}),
      },
      workExperience: data.workExperience.map((w) => ({
        company: w.company,
        position: w.position,
        startDate: w.startDate,
        endDate: w.endDate || null,
        current: w.current,
        description: w.description || null,
      })),
      education: data.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startDate: e.startDate,
        endDate: e.endDate || null,
        current: e.current,
      })),
      ...(filledLanguages.length > 0 ? { languages: filledLanguages } : {}),
    } as ResumeCreateInput
    void onSubmit(payload)
  }

  const mainButtonActive = useTelegramMainButton({
    text: isLoading ? t('forms.resume.saving') : t('forms.resume.save'),
    onClick: () => void handleSubmit(handleFormSubmit)(),
    disabled: !!isLoading,
  })

  const watchWorkExperience = watch('workExperience')

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Секция: Личные данные */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            {t('forms.resume.sectionPersonal')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="firstName">{t('forms.resume.firstNameLabel')} *</FieldLabel>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <FieldError errors={[errors.firstName]} />}
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">{t('forms.resume.lastNameLabel')} *</FieldLabel>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <FieldError errors={[errors.lastName]} />}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t('forms.resume.countryLabel')} *</FieldLabel>
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
              <FieldLabel>{t('forms.resume.cityLabel')}</FieldLabel>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <CitySelect
                    country={selectedCountry}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder={t('forms.resume.cityPlaceholder')}
                  />
                )}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Секция: Пожелания */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-muted-foreground" />
            {t('forms.resume.sectionPreferences')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field>
            <FieldLabel htmlFor="title">{t('forms.resume.titleLabel')} *</FieldLabel>
            <Input id="title" {...register('title')} placeholder="Senior Frontend Developer" />
            {errors.title && <FieldError errors={[errors.title]} />}
          </Field>

          <Field>
            <FieldLabel>{t('forms.resume.workFormatLabel')} *</FieldLabel>
            <Controller
              control={control}
              name="workFormat"
              render={({ field }) => (
                <EnumPills
                  id="resumeWorkFormat"
                  values={RESUME_WORK_FORMAT_VALUES as readonly ResumeWorkFormatEnum[]}
                  value={field.value}
                  onChange={field.onChange}
                  getLabel={(v) => t(`enums.resumeWorkFormat.${v}`)}
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel>{t('forms.resume.employmentTypeLabel')} *</FieldLabel>
            <Controller
              control={control}
              name="employmentType"
              render={({ field }) => (
                <EnumPills
                  id="resumeEmploymentType"
                  values={RESUME_EMPLOYMENT_TYPE_VALUES as readonly EmploymentTypeEnum[]}
                  value={field.value}
                  onChange={field.onChange}
                  getLabel={(v) => t(`enums.employmentType.${v}`)}
                />
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="desiredSalary">{t('forms.resume.salaryLabel')}</FieldLabel>
              <Input id="desiredSalary" type="number" {...register('desiredSalary')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="currency">{t('forms.resume.currencyLabel')}</FieldLabel>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['USD', 'EUR', 'RUB', 'GBP'].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="experienceYears">{t('forms.resume.experienceLabel')}</FieldLabel>
              <Input id="experienceYears" type="number" {...register('experienceYears')} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Секция: О себе */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlignLeft className="h-4 w-4 text-muted-foreground" />
            {t('forms.resume.sectionAbout')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="about">{t('forms.resume.aboutLabel')}</FieldLabel>
            <Textarea
              id="about"
              {...register('about')}
              rows={4}
              placeholder={t('forms.resume.aboutPlaceholder')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="skills">{t('forms.resume.skillsLabel')}</FieldLabel>
            <Input id="skills" {...register('skills')} placeholder="React, TypeScript, Node.js" />
          </Field>
        </CardContent>
      </Card>

      {/* Секция: Опыт работы */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              {t('forms.resume.sectionWorkExp')}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendWork({
                  company: '',
                  position: '',
                  startDate: '',
                  endDate: '',
                  current: false,
                  description: '',
                })
              }
            >
              {t('forms.resume.addWorkExp')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workFields.map((field, index) => (
            <Card key={field.id} className="bg-muted/30">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWork(index)}
                    aria-label={t('forms.resume.removeEntry')}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>{t('forms.resume.companyLabel')} *</FieldLabel>
                    <Input {...register(`workExperience.${index}.company`)} />
                    {errors.workExperience?.[index]?.company && (
                      <FieldError errors={[errors.workExperience[index].company]} />
                    )}
                  </Field>
                  <Field>
                    <FieldLabel>{t('forms.resume.positionLabel')} *</FieldLabel>
                    <Input {...register(`workExperience.${index}.position`)} />
                    {errors.workExperience?.[index]?.position && (
                      <FieldError errors={[errors.workExperience[index].position]} />
                    )}
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>{t('forms.resume.startDateLabel')} *</FieldLabel>
                    <Controller
                      control={control}
                      name={`workExperience.${index}.startDate`}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('forms.resume.startDateLabel')}
                          locale={dateLocale}
                        />
                      )}
                    />
                    {errors.workExperience?.[index]?.startDate && (
                      <FieldError errors={[errors.workExperience[index].startDate]} />
                    )}
                  </Field>
                  <Field>
                    <FieldLabel>{t('forms.resume.endDateLabel')}</FieldLabel>
                    <Controller
                      control={control}
                      name={`workExperience.${index}.endDate`}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          placeholder={t('forms.resume.endDateLabel')}
                          disabled={!!watchWorkExperience[index]?.current}
                          locale={dateLocale}
                        />
                      )}
                    />
                  </Field>
                </div>
                <Field orientation="horizontal" className="gap-2">
                  <Controller
                    control={control}
                    name={`workExperience.${index}.current`}
                    render={({ field }) => (
                      <Switch
                        id={`current-work-${index}`}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <FieldLabel htmlFor={`current-work-${index}`}>
                    {t('forms.resume.currentlyWorking')}
                  </FieldLabel>
                </Field>
                <Field>
                  <FieldLabel>{t('forms.resume.descriptionLabel')}</FieldLabel>
                  <Textarea {...register(`workExperience.${index}.description`)} rows={2} />
                </Field>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Секция: Образование */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              {t('forms.resume.sectionEducation')}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendEdu({
                  institution: '',
                  degree: '',
                  field: '',
                  startDate: '',
                  endDate: '',
                  current: false,
                })
              }
            >
              {t('forms.resume.addEducation')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {eduFields.map((field, index) => (
            <Card key={field.id} className="bg-muted/30">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('forms.resume.educationEntry', { num: index + 1 })}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEdu(index)}
                    aria-label={t('forms.resume.removeEntry')}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Field>
                  <FieldLabel>{t('forms.resume.institutionLabel')} *</FieldLabel>
                  <Input {...register(`education.${index}.institution`)} />
                  {errors.education?.[index]?.institution && (
                    <FieldError errors={[errors.education[index].institution]} />
                  )}
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>{t('forms.resume.degreeLabel')} *</FieldLabel>
                    <Input
                      {...register(`education.${index}.degree`)}
                      placeholder={t('forms.resume.degreePlaceholder')}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t('forms.resume.fieldLabel')} *</FieldLabel>
                    <Input
                      {...register(`education.${index}.field`)}
                      placeholder={t('forms.resume.fieldPlaceholder')}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>{t('forms.resume.startDateLabel')} *</FieldLabel>
                    <Controller
                      control={control}
                      name={`education.${index}.startDate`}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('forms.resume.startDateLabel')}
                          locale={dateLocale}
                        />
                      )}
                    />
                    {errors.education?.[index]?.startDate && (
                      <FieldError errors={[errors.education[index].startDate]} />
                    )}
                  </Field>
                  <Field>
                    <FieldLabel>{t('forms.resume.endDateLabel')}</FieldLabel>
                    <Controller
                      control={control}
                      name={`education.${index}.endDate`}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          placeholder={t('forms.resume.endDateLabel')}
                          locale={dateLocale}
                        />
                      )}
                    />
                  </Field>
                </div>
                <Field orientation="horizontal" className="gap-2">
                  <Controller
                    control={control}
                    name={`education.${index}.current`}
                    render={({ field }) => (
                      <Switch
                        id={`current-edu-${index}`}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <FieldLabel htmlFor={`current-edu-${index}`}>
                    {t('forms.resume.currentlyStudying')}
                  </FieldLabel>
                </Field>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Секция: Языки */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {t('forms.resume.sectionLanguages')}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendLang({ lang: '', level: '' })}
            >
              {t('forms.resume.addLanguage')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {langFields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-3">
              <Field className="flex-1">
                <FieldLabel>{t('forms.resume.languageLabel')}</FieldLabel>
                <Input
                  {...register(`languages.${index}.lang`)}
                  placeholder={t('forms.resume.languagePlaceholder')}
                />
              </Field>
              <Field className="flex-1">
                <FieldLabel>{t('forms.resume.languageLevelLabel')}</FieldLabel>
                <Input
                  {...register(`languages.${index}.level`)}
                  placeholder={t('forms.resume.languageLevelPlaceholder')}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLang(index)}
                aria-label={t('forms.resume.removeEntry')}
                className="mb-0.5"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Секция: Контакты */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {t('forms.resume.sectionContacts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="contactTelegram">{t('forms.resume.telegramLabel')}</FieldLabel>
              <Input
                id="contactTelegram"
                {...register('contactTelegram')}
                placeholder="@username"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="contactEmail">{t('forms.resume.emailLabel')}</FieldLabel>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="contactPhone">{t('forms.resume.phoneLabel')}</FieldLabel>
              <Input id="contactPhone" {...register('contactPhone')} placeholder="+7..." />
            </Field>
          </div>
        </CardContent>
      </Card>

      {!mainButtonActive && (
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? t('forms.resume.saving') : t('forms.resume.save')}
        </Button>
      )}
    </form>
  )
}
