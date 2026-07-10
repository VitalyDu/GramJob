'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Static schema for type inference only
const _baseSchema = z.object({
  identifier: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof _baseSchema>

export const EmailLoginForm = observer(function EmailLoginForm() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const router = useRouter()
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        identifier: z.string().email(t('auth.validation.invalidEmail')),
        password: z.string().min(6, t('auth.validation.minPassword')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await auth.loginWithEmail(data.identifier, data.password)
      router.push('/')
    } catch {
      // error сохранён в auth.error
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="identifier">{t('auth.email')}</Label>
        <Input id="identifier" type="email" {...register('identifier')} />
        {errors.identifier && (
          <p className="text-sm text-destructive">{errors.identifier.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline hover:no-underline"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      {auth.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {auth.error}
        </p>
      )}

      {auth.emailNotConfirmed && (
        <div className="space-y-1">
          {resent ? (
            <p className="text-sm text-green-600">{t('auth.confirmEmailResent')}</p>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setResendError(null)
                void auth
                  .resendConfirmation(getValues('identifier'))
                  .then(() => setResent(true))
                  .catch((e: unknown) =>
                    setResendError(e instanceof Error ? e.message : t('common.error'))
                  )
              }}
            >
              {t('auth.resendConfirmation')}
            </Button>
          )}
          {resendError && <p className="text-sm text-destructive">{resendError}</p>}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={auth.isLoading}>
        {auth.isLoading ? t('common.loading') : t('auth.login')}
      </Button>
    </form>
  )
})
