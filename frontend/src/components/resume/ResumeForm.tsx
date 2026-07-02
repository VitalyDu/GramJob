'use client'

import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'
import type { ResumeCreateInput, ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'

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

  const watchWorkExperience = watch('workExperience')

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Info */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-card-foreground">Основная информация</h2>

        <div>
          <Label htmlFor="title">Заголовок резюме *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Senior Frontend Developer"
            className="mt-1"
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Имя *</Label>
            <Input id="firstName" {...register('firstName')} className="mt-1" />
            {errors.firstName && (
              <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="lastName">Фамилия *</Label>
            <Input id="lastName" {...register('lastName')} className="mt-1" />
            {errors.lastName && (
              <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Страна *</Label>
            <Input id="country" {...register('country')} placeholder="RU" className="mt-1" />
            {errors.country && (
              <p className="mt-1 text-xs text-destructive">{errors.country.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="city">Город</Label>
            <Input id="city" {...register('city')} placeholder="Москва" className="mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="workFormat">Формат работы *</Label>
            <select
              id="workFormat"
              {...register('workFormat')}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(RESUME_WORK_FORMAT_LABELS) as ResumeWorkFormatEnum[]).map((fmt) => (
                <option key={fmt} value={fmt}>
                  {RESUME_WORK_FORMAT_LABELS[fmt]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="employmentType">Тип занятости *</Label>
            <select
              id="employmentType"
              {...register('employmentType')}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(RESUME_EMPLOYMENT_TYPE_LABELS) as EmploymentTypeEnum[]).map((t) => (
                <option key={t} value={t}>
                  {RESUME_EMPLOYMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="desiredSalary">Желаемая зарплата</Label>
            <Input
              id="desiredSalary"
              type="number"
              {...register('desiredSalary')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="currency">Валюта</Label>
            <select
              id="currency"
              {...register('currency')}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {['USD', 'EUR', 'RUB', 'GBP'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="experienceYears">Опыт (лет)</Label>
            <Input
              id="experienceYears"
              type="number"
              {...register('experienceYears')}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="about">О себе</Label>
          <textarea
            id="about"
            {...register('about')}
            rows={4}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Кратко о себе, ключевые навыки и достижения..."
          />
        </div>

        <div>
          <Label htmlFor="skills">Навыки (через запятую)</Label>
          <Input
            id="skills"
            {...register('skills')}
            placeholder="React, TypeScript, Node.js"
            className="mt-1"
          />
        </div>
      </section>

      {/* Contacts */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-card-foreground">Контакты</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="contactTelegram">Telegram</Label>
            <Input
              id="contactTelegram"
              {...register('contactTelegram')}
              placeholder="@username"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" {...register('contactEmail')} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="contactPhone">Телефон</Label>
            <Input
              id="contactPhone"
              {...register('contactPhone')}
              placeholder="+7..."
              className="mt-1"
            />
          </div>
        </div>
      </section>

      {/* Work Experience */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-card-foreground">Опыт работы</h2>
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

        {workFields.map((field, index) => (
          <div key={field.id} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Место работы {index + 1}</p>
              <button
                type="button"
                onClick={() => removeWork(index)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Удалить
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Компания *</Label>
                <Input {...register(`workExperience.${index}.company`)} className="mt-1" />
                {errors.workExperience?.[index]?.company && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.workExperience[index].company?.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Должность *</Label>
                <Input {...register(`workExperience.${index}.position`)} className="mt-1" />
                {errors.workExperience?.[index]?.position && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.workExperience[index].position?.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Начало *</Label>
                <Input
                  type="date"
                  {...register(`workExperience.${index}.startDate`)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Конец</Label>
                <Input
                  type="date"
                  {...register(`workExperience.${index}.endDate`)}
                  className="mt-1"
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
            <div>
              <Label>Описание</Label>
              <textarea
                {...register(`workExperience.${index}.description`)}
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Education */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-card-foreground">Образование</h2>
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

        {eduFields.map((field, index) => (
          <div key={field.id} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Образование {index + 1}</p>
              <button
                type="button"
                onClick={() => removeEdu(index)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Удалить
              </button>
            </div>
            <div>
              <Label>Учебное заведение *</Label>
              <Input {...register(`education.${index}.institution`)} className="mt-1" />
              {errors.education?.[index]?.institution && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.education[index].institution?.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Степень *</Label>
                <Input
                  {...register(`education.${index}.degree`)}
                  placeholder="Бакалавр"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Специальность *</Label>
                <Input
                  {...register(`education.${index}.field`)}
                  placeholder="Информатика"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Начало *</Label>
                <Input type="date" {...register(`education.${index}.startDate`)} className="mt-1" />
              </div>
              <div>
                <Label>Конец</Label>
                <Input type="date" {...register(`education.${index}.endDate`)} className="mt-1" />
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
          </div>
        ))}
      </section>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </form>
  )
}
