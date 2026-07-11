'use client'

import { useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Link, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { CompanyCreateInput, CompanySizeEnum } from '@/types/api'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'

const COMPANY_SIZE_VALUES = Object.keys(COMPANY_SIZE_LABELS) as [
  CompanySizeEnum,
  ...CompanySizeEnum[],
]
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { useTelegramMainButton } from '@/hooks/useTelegramMainButton'
import { scrollToFirstFormError } from '@/lib/form-utils'
import { CountrySelect } from '@/components/ui/country-select'
import { CitySelect } from '@/components/ui/city-select'

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

// Static schema for type inference only
const _baseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  country: z.string().min(1),
  city: z.string().optional().default(''),
  companySize: z.enum(COMPANY_SIZE_VALUES),
  website: z.string().url().or(z.literal('')).optional().default(''),
  telegram: z.string().optional().default(''),
  linkedin: z.string().url().or(z.literal('')).optional().default(''),
})

type FormData = z.infer<typeof _baseSchema>

interface Props {
  onSubmit: (data: FormData, e?: React.BaseSyntheticEvent) => void | Promise<void>
  defaultValues?: Partial<CompanyCreateInput>
  isLoading?: boolean
}

const SIZE_OPTIONS = Object.entries(COMPANY_SIZE_LABELS) as Array<[CompanySizeEnum, string]>

export function CompanyForm({ onSubmit, defaultValues, isLoading }: Props) {
  const { t } = useTranslation()

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('forms.company.nameRequired')),
        description: z.string().optional().default(''),
        country: z.string().min(1, t('forms.company.countryRequired')),
        city: z.string().optional().default(''),
        companySize: z.enum(COMPANY_SIZE_VALUES),
        website: z
          .string()
          .url(t('forms.company.invalidUrl'))
          .or(z.literal(''))
          .optional()
          .default(''),
        telegram: z.string().optional().default(''),
        linkedin: z
          .string()
          .url(t('forms.company.invalidUrl'))
          .or(z.literal(''))
          .optional()
          .default(''),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      country: defaultValues?.country ?? '',
      city: defaultValues?.city ?? '',
      companySize: defaultValues?.companySize ?? 'size_1_10',
      website: defaultValues?.website ?? '',
      telegram: defaultValues?.telegram ?? '',
      linkedin: defaultValues?.linkedin ?? '',
    },
  })

  const selectedCountry = useWatch({ control, name: 'country' })
  useEffect(() => {
    setValue('city', '')
  }, [selectedCountry, setValue])

  const mainButtonActive = useTelegramMainButton({
    text: isLoading ? t('forms.company.saving') : t('forms.company.save'),
    onClick: () => void handleSubmit(onSubmit, scrollToFirstFormError)(),
    disabled: !!isLoading,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit, scrollToFirstFormError)} className="space-y-5">
      {/* Секция: Основное */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {t('forms.company.sectionMain')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="name">{t('forms.company.nameLabel')} *</FieldLabel>
            <Input
              id="name"
              {...register('name')}
              placeholder={t('forms.company.namePlaceholder')}
            />
            {errors.name && <FieldError errors={[errors.name]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor="description">{t('forms.company.descriptionLabel')}</FieldLabel>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={t('forms.company.descriptionPlaceholder')}
              rows={4}
            />
            {errors.description && <FieldError errors={[errors.description]} />}
          </Field>
        </CardContent>
      </Card>

      {/* Секция: Контакты */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="h-4 w-4 text-muted-foreground" />
            {t('forms.company.sectionContacts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="website">{t('forms.company.websiteLabel')}</FieldLabel>
            <Input id="website" {...register('website')} placeholder="https://example.com" />
            {errors.website && <FieldError errors={[errors.website]} />}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="telegram">{t('forms.company.telegramLabel')}</FieldLabel>
              <Input id="telegram" {...register('telegram')} placeholder="@company" />
            </Field>

            <Field>
              <FieldLabel htmlFor="linkedin">{t('forms.company.linkedinLabel')}</FieldLabel>
              <Input
                id="linkedin"
                {...register('linkedin')}
                placeholder="https://linkedin.com/company/..."
              />
              {errors.linkedin && <FieldError errors={[errors.linkedin]} />}
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Секция: Локация */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {t('forms.company.sectionLocation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t('forms.company.countryLabel')} *</FieldLabel>
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
              <FieldLabel>{t('forms.company.cityLabel')}</FieldLabel>
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

          <Field>
            <FieldLabel>{t('forms.company.companySizeLabel')}</FieldLabel>
            <Controller
              control={control}
              name="companySize"
              render={({ field }) => (
                <EnumPills
                  id="companySize"
                  values={COMPANY_SIZE_VALUES}
                  value={field.value}
                  onChange={field.onChange}
                  getLabel={(v) => {
                    const label = COMPANY_SIZE_LABELS[v]
                    return `${label} ${t('forms.company.employees')}`
                  }}
                />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      {!mainButtonActive && (
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('forms.company.saving') : t('forms.company.save')}
        </Button>
      )}
    </form>
  )
}
