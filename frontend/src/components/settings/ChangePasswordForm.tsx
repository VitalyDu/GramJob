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
  currentPassword: z.string().min(6),
  password: z.string().min(6),
  passwordConfirmation: z.string(),
})

type FormData = z.infer<typeof _baseSchema>

export const ChangePasswordForm = observer(function ChangePasswordForm() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(6, t('auth.validation.minPassword')),
          password: z.string().min(6, t('auth.validation.minPassword')),
          passwordConfirmation: z.string(),
        })
        .refine((d) => d.password === d.passwordConfirmation, {
          message: t('auth.validation.passwordsNotMatch'),
          path: ['passwordConfirmation'],
        }),
    [t]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setSaved(false)
    setError(null)
    try {
      await auth.changePassword(data.currentPassword, data.password, data.passwordConfirmation)
      setSaved(true)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.security.changeError'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">{t('settings.security.currentPassword')}</Label>
        <Input id="currentPassword" type="password" {...register('currentPassword')} />
        {errors.currentPassword && (
          <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t('settings.security.newPassword')}</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="passwordConfirmation">{t('auth.confirmPassword')}</Label>
        <Input id="passwordConfirmation" type="password" {...register('passwordConfirmation')} />
        {errors.passwordConfirmation && (
          <p className="text-sm text-destructive">{errors.passwordConfirmation.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">{t('settings.security.changed')}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('common.loading') : t('settings.security.change')}
      </Button>
    </form>
  )
})
