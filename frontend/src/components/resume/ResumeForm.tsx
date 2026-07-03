'use client'

import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2 } from 'lucide-react'
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
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'
import type { ResumeCreateInput, ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'
import { useTelegramMainButton } from '@/hooks/useTelegramMainButton'

const workExperienceSchema = z.object({
  company: z.string().min(1, 'Компания обязательна'),
  position: z.string().min(1, 'Должность обязательна'),
  startDate: z.string().min(1, 'Дата начала обязательна'),
  endDate: z.string().optional().default(''),
  current: z.boolean().default(false),
  description: z.string().optional().default(''),
})

const educationSchema = z.object({
  institution: z.string().min(1, 'Учебное заведение обязательно'),
  degree: z.string().min(1, 'Степень обязательна'),
  field: z.string().min(1, 'Специальность обязательна'),
  startDate: z.string().min(1, 'Дата начала обязательна'),
  endDate: z.string().optional().default(''),
  current: z.boolean().default(false),
})

const schema = z.object({
  title: z.string().min(1, 'Заголовок обязателен'),
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  country: z.string().min(1, 'Страна обязательна'),
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
})

type FormData = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<ResumeCreateInput>
  isLoading?: boolean
  onSubmit: (data: ResumeCreateInput) => void | Promise<void>
}

export function ResumeForm({ defaultValues, isLoading, onSubmit }: Props) {
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
      desiredSalary: defaultValues?.desiredSalary,
      currency: defaultValues?.currency ?? 'USD',
      workFormat: (defaultValues?.workFormat as ResumeWorkFormatEnum) ?? 'remote',
      employmentType: (defaultValues?.employmentType as EmploymentTypeEnum) ?? 'full-time',
      experienceYears: defaultValues?.experienceYears,
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

  const handleFormSubmit = (data: FormData) => {
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
    } as ResumeCreateInput
    void onSubmit(payload)
  }

  const mainButtonActive = useTelegramMainButton({
    text: isLoading ? 'Сохранение...' : 'Сохранить',
    onClick: () => void handleSubmit(handleFormSubmit)(),
    disabled: !!isLoading,
  })

  const watchWorkExperience = watch('workExperience')

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Секция: Личные данные */}
      <Card>
        <CardHeader>
          <CardTitle>Личные данные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Имя *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="country">Страна *</Label>
              <Input id="country" {...register('country')} placeholder="RU" />
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Город</Label>
              <Input id="city" {...register('city')} placeholder="Москва" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Секция: Пожелания */}
      <Card>
        <CardHeader>
          <CardTitle>Пожелания</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Желаемая должность *</Label>
            <Input id="title" {...register('title')} placeholder="Senior Frontend Developer" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="workFormat">Формат работы *</Label>
              <Controller
                control={control}
                name="workFormat"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="workFormat" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RESUME_WORK_FORMAT_LABELS) as ResumeWorkFormatEnum[]).map(
                        (fmt) => (
                          <SelectItem key={fmt} value={fmt}>
                            {RESUME_WORK_FORMAT_LABELS[fmt]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employmentType">Тип занятости *</Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="employmentType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RESUME_EMPLOYMENT_TYPE_LABELS) as EmploymentTypeEnum[]).map(
                        (t) => (
                          <SelectItem key={t} value={t}>
                            {RESUME_EMPLOYMENT_TYPE_LABELS[t]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="desiredSalary">Желаемая зарплата</Label>
              <Input id="desiredSalary" type="number" {...register('desiredSalary')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Валюта</Label>
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
              <Label htmlFor="experienceYears">Опыт (лет)</Label>
              <Input id="experienceYears" type="number" {...register('experienceYears')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Секция: О себе */}
      <Card>
        <CardHeader>
          <CardTitle>О себе</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="about">О себе</Label>
            <Textarea
              id="about"
              {...register('about')}
              rows={4}
              placeholder="Кратко о себе, ключевые навыки и достижения..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skills">Навыки (через запятую)</Label>
            <Input id="skills" {...register('skills')} placeholder="React, TypeScript, Node.js" />
          </div>
        </CardContent>
      </Card>

      {/* Секция: Опыт работы */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Опыт работы</CardTitle>
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
              + Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workFields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Место работы {index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWork(index)}
                    aria-label="Удалить"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Компания *</Label>
                    <Input {...register(`workExperience.${index}.company`)} />
                    {errors.workExperience?.[index]?.company && (
                      <p className="text-sm text-destructive">
                        {errors.workExperience[index].company?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Должность *</Label>
                    <Input {...register(`workExperience.${index}.position`)} />
                    {errors.workExperience?.[index]?.position && (
                      <p className="text-sm text-destructive">
                        {errors.workExperience[index].position?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Начало *</Label>
                    <Input type="date" {...register(`workExperience.${index}.startDate`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Конец</Label>
                    <Input
                      type="date"
                      {...register(`workExperience.${index}.endDate`)}
                      disabled={watchWorkExperience[index]?.current}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`current-work-${index}`}
                    {...register(`workExperience.${index}.current`)}
                    className="rounded"
                  />
                  <Label htmlFor={`current-work-${index}`}>Работаю сейчас</Label>
                </div>
                <div className="space-y-1.5">
                  <Label>Описание</Label>
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
            <CardTitle>Образование</CardTitle>
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
              + Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {eduFields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Образование {index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEdu(index)}
                    aria-label="Удалить"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Учебное заведение *</Label>
                  <Input {...register(`education.${index}.institution`)} />
                  {errors.education?.[index]?.institution && (
                    <p className="text-sm text-destructive">
                      {errors.education[index].institution?.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Степень *</Label>
                    <Input {...register(`education.${index}.degree`)} placeholder="Бакалавр" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Специальность *</Label>
                    <Input {...register(`education.${index}.field`)} placeholder="Информатика" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Начало *</Label>
                    <Input type="date" {...register(`education.${index}.startDate`)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Конец</Label>
                    <Input type="date" {...register(`education.${index}.endDate`)} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`current-edu-${index}`}
                    {...register(`education.${index}.current`)}
                    className="rounded"
                  />
                  <Label htmlFor={`current-edu-${index}`}>Учусь сейчас</Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Секция: Контакты */}
      <Card>
        <CardHeader>
          <CardTitle>Контакты</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactTelegram">Telegram</Label>
              <Input
                id="contactTelegram"
                {...register('contactTelegram')}
                placeholder="@username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Телефон</Label>
              <Input id="contactPhone" {...register('contactPhone')} placeholder="+7..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {!mainButtonActive && (
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      )}
    </form>
  )
}
