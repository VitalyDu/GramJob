'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const _baseSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})

type FormData = z.infer<typeof _baseSchema>

export const ProfileSettingsForm = observer(function ProfileSettingsForm() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, t('auth.validation.enterFirstName')),
        lastName: z.string().min(1, t('auth.validation.enterLastName')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: auth.user?.firstName ?? '',
      lastName: auth.user?.lastName ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setSaved(false)
    setError(null)
    try {
      await auth.updateProfile(data)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.profile.saveError'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t('auth.firstName')}</Label>
          <Input id="firstName" {...register('firstName')} />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t('auth.lastName')}</Label>
          <Input id="lastName" {...register('lastName')} />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      {auth.user?.email && <p className="text-sm text-muted-foreground">{auth.user.email}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">{t('settings.profile.saved')}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('common.loading') : t('settings.profile.save')}
      </Button>
    </form>
  )
})
