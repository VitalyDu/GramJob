'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CompanyCreateInput, CompanySizeEnum } from '@/types/api'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'

const COMPANY_SIZE_VALUES = Object.keys(COMPANY_SIZE_LABELS) as [
  CompanySizeEnum,
  ...CompanySizeEnum[],
]
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional().default(''),
  country: z.string().min(1, 'Страна обязательна'),
  city: z.string().optional().default(''),
  companySize: z.enum(COMPANY_SIZE_VALUES),
  website: z.string().url('Введите корректный URL').or(z.literal('')).optional().default(''),
  telegram: z.string().optional().default(''),
  linkedin: z.string().url('Введите корректный URL').or(z.literal('')).optional().default(''),
})

type FormData = z.infer<typeof schema>

interface Props {
  onSubmit: (data: FormData, e?: React.BaseSyntheticEvent) => void | Promise<void>
  defaultValues?: Partial<CompanyCreateInput>
  isLoading?: boolean
}

const SIZE_OPTIONS = Object.entries(COMPANY_SIZE_LABELS) as Array<[CompanySizeEnum, string]>

export function CompanyForm({ onSubmit, defaultValues, isLoading }: Props) {
  const {
    register,
    handleSubmit,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Название *</Label>
        <Input id="name" {...register('name')} placeholder="Название компании" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Описание</Label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="Расскажите о компании"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          rows={4}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

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

      <div className="space-y-1">
        <Label htmlFor="companySize">Размер компании</Label>
        <select
          id="companySize"
          {...register('companySize')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SIZE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label} сотрудников
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="website">Сайт</Label>
        <Input id="website" {...register('website')} placeholder="https://example.com" />
        {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="telegram">Telegram</Label>
          <Input id="telegram" {...register('telegram')} placeholder="@company" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            {...register('linkedin')}
            placeholder="https://linkedin.com/company/..."
          />
          {errors.linkedin && <p className="text-xs text-destructive">{errors.linkedin.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </form>
  )
}
