'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { scrollToFirstFormError } from '@/lib/form-utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Static schema for type inference only (without refine, which changes the type)
const _baseSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
})

type FormData = z.infer<typeof _baseSchema>

export const EmailRegisterForm = observer(function EmailRegisterForm() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const router = useRouter()
  const [sentEmail, setSentEmail] = useState('')
  const [resent, setResent] = useState(false)

  const schema = useMemo(
    () =>
      z
        .object({
          firstName: z.string().min(1, t('auth.validation.enterFirstName')),
          lastName: z.string().min(1, t('auth.validation.enterLastName')),
          email: z.string().email(t('auth.validation.invalidEmail')),
          password: z.string().min(6, t('auth.validation.minPassword')),
          confirmPassword: z.string(),
        })
        .refine((d) => d.password === d.confirmPassword, {
          message: t('auth.validation.passwordsNotMatch'),
          path: ['confirmPassword'],
        }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setSentEmail(data.email)
    try {
      await auth.registerWithEmail(data.email, data.password, data.firstName, data.lastName)
      if (!auth.pendingEmailConfirmation) router.push('/')
    } catch {
      // error сохранён в auth.error
    }
  }

  if (auth.pendingEmailConfirmation) {
    return (
      <div className="space-y-4 rounded-md border border-border bg-card p-6 text-center">
        <p className="font-semibold">{t('auth.confirmEmailTitle')}</p>
        <p className="text-sm text-muted-foreground">
          {t('auth.confirmEmailDesc', { email: sentEmail })}
        </p>
        {resent ? (
          <p className="text-sm text-green-600">{t('auth.confirmEmailResent')}</p>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              void auth.resendConfirmation(sentEmail).then(() => setResent(true))
            }}
          >
            {t('auth.resendConfirmation')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, scrollToFirstFormError)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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

      <div className="space-y-1.5">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
        <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {auth.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {auth.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={auth.isLoading}>
        {auth.isLoading ? t('common.loading') : t('auth.register')}
      </Button>
    </form>
  )
})
