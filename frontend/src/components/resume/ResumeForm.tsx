'use client'

import { useMemo } from 'react'
import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { RESUME_WORK_FORMAT_VALUES, RESUME_EMPLOYMENT_TYPE_VALUES } from '@/lib/resume-utils'
import { CountrySelect } from '@/components/ui/country-select'
import type { ResumeCreateInput, ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'
import { useTelegramMainButton } from '@/hooks/useTelegramMainButton'

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
  const { t } = useTranslation()

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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Секция: Личные данные */}
      <Card>
        <CardHeader>
          <CardTitle>{t('forms.resume.sectionPersonal')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{t('forms.resume.firstNameLabel')} *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{t('forms.resume.lastNameLabel')} *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('forms.resume.countryLabel')} *</Label>
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
              <Label htmlFor="city">{t('forms.resume.cityLabel')}</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder={t('forms.resume.cityPlaceholder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Секция: Пожелания */}
      <Card>
        <CardHeader>
          <CardTitle>{t('forms.resume.sectionPreferences')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t('forms.resume.titleLabel')} *</Label>
            <Input id="title" {...register('title')} placeholder="Senior Frontend Developer" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="workFormat">{t('forms.resume.workFormatLabel')} *</Label>
              <Controller
                control={control}
                name="workFormat"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="workFormat" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(RESUME_WORK_FORMAT_VALUES as readonly ResumeWorkFormatEnum[]).map((fmt) => (
                        <SelectItem key={fmt} value={fmt}>
                          {t(`enums.resumeWorkFormat.${fmt}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employmentType">{t('forms.resume.employmentTypeLabel')} *</Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="employmentType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(RESUME_EMPLOYMENT_TYPE_VALUES as readonly EmploymentTypeEnum[]).map(
                        (empType) => (
                          <SelectItem key={empType} value={empType}>
                            {t(`enums.employmentType.${empType}`)}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="desiredSalary">{t('forms.resume.salaryLabel')}</Label>
              <Input id="desiredSalary" type="number" {...register('desiredSalary')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">{t('forms.resume.currencyLabel')}</Label>
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experienceYears">{t('forms.resume.experienceLabel')}</Label>
              <Input id="experienceYears" type="number" {...register('experienceYears')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Секция: О себе */}
      <Card>
        <CardHeader>
          <CardTitle>{t('forms.resume.sectionAbout')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="about">{t('forms.resume.aboutLabel')}</Label>
            <Textarea
              id="about"
              {...register('about')}
              rows={4}
              placeholder={t('forms.resume.aboutPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skills">{t('forms.resume.skillsLabel')}</Label>
            <Input id="skills" {...register('skills')} placeholder="React, TypeScript, Node.js" />
          </div>
        </CardContent>
      </Card>

      {/* Секция: Опыт работы */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('forms.resume.sectionWorkExp')}</CardTitle>
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
            <Card key={field.id}>
              <CardHeader>
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
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('forms.resume.companyLabel')} *</Label>
                    <Input {...register(`workExperience.${index}.company`)} />
                    {errors.workExperience?.[index]?.company && (
                      <p className="text-sm text-destructive">
                        {errors.workExperience[index].company?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('forms.resume.positionLabel')} *</Label>
                    <Input {...register(`workExperience.${index}.position`)} />
                    {errors.workExperience?.[index]?.position && (
                      <p className="text-sm text-destructive">
                        {errors.workExperience[index].position?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('forms.resume.startDateLabel')} *</Label>
                    <Input
                      type="date"
                      className="min-w-0"
                      {...register(`workExperience.${index}.startDate`)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('forms.resume.endDateLabel')}</Label>
                    <Input
                      type="date"
                      className="min-w-0"
                      {...register(`workExperience.${index}.endDate`)}
                      disabled={watchWorkExperience[index]?.current}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <Label htmlFor={`current-work-${index}`}>
                    {t('forms.resume.currentlyWorking')}
                  </Label>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('forms.resume.descriptionLabel')}</Label>
                  <Textarea {...register(`workExperience.${index}.description`)} rows={2} />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Секция: Образование */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('forms.resume.sectionEducation')}</CardTitle>
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
            <Card key={field.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
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
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('forms.resume.institutionLabel')} *</Label>
                  <Input {...register(`education.${index}.institution`)} />
                  {errors.education?.[index]?.institution && (
                    <p className="text-sm text-destructive">
                      {errors.education[index].institution?.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('forms.resume.degreeLabel')} *</Label>
                    <Input
                      {...register(`education.${index}.degree`)}
                      placeholder={t('forms.resume.degreePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('forms.resume.fieldLabel')} *</Label>
                    <Input
                      {...register(`education.${index}.field`)}
                      placeholder={t('forms.resume.fieldPlaceholder')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('forms.resume.startDateLabel')} *</Label>
                    <Input
                      type="date"
                      className="min-w-0"
                      {...register(`education.${index}.startDate`)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('forms.resume.endDateLabel')}</Label>
                    <Input
                      type="date"
                      className="min-w-0"
                      {...register(`education.${index}.endDate`)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <Label htmlFor={`current-edu-${index}`}>
                    {t('forms.resume.currentlyStudying')}
                  </Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Секция: Языки */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('forms.resume.sectionLanguages')}</CardTitle>
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
              <div className="flex-1 space-y-1.5">
                <Label>{t('forms.resume.languageLabel')}</Label>
                <Input
                  {...register(`languages.${index}.lang`)}
                  placeholder={t('forms.resume.languagePlaceholder')}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>{t('forms.resume.languageLevelLabel')}</Label>
                <Input
                  {...register(`languages.${index}.level`)}
                  placeholder={t('forms.resume.languageLevelPlaceholder')}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLang(index)}
                aria-label={t('forms.resume.removeEntry')}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Секция: Контакты */}
      <Card>
        <CardHeader>
          <CardTitle>{t('forms.resume.sectionContacts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="contactTelegram">{t('forms.resume.telegramLabel')}</Label>
              <Input
                id="contactTelegram"
                {...register('contactTelegram')}
                placeholder="@username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">{t('forms.resume.emailLabel')}</Label>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">{t('forms.resume.phoneLabel')}</Label>
              <Input id="contactPhone" {...register('contactPhone')} placeholder="+7..." />
            </div>
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
