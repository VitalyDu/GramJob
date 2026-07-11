'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { scrollToFirstFormError } from '@/lib/form-utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

// Static schema for type inference only (without refine, which changes the type)
const _baseSchema = z.object({
  password: z.string().min(6),
  confirmPassword: z.string(),
})

type FormData = z.infer<typeof _baseSchema>

export const ResetPasswordCard = observer(function ResetPasswordCard() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const schema = useMemo(
    () =>
      z
        .object({
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
    if (!code) return
    try {
      await auth.resetPassword(code, data.password, data.confirmPassword)
      router.push('/')
    } catch {
      // error сохранён в auth.error
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl">{t('auth.resetPasswordTitle')}</CardTitle>
        <CardDescription>{t('auth.resetPasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!code ? (
          <div className="space-y-3">
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t('auth.resetMissingCode')}
            </p>
            <Link href="/forgot-password" className="text-sm underline hover:no-underline">
              {t('auth.requestNewLink')}
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit, scrollToFirstFormError)}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('auth.newPassword')}</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {auth.error && (
              <div className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm">
                <p className="text-destructive">{auth.error}</p>
                <Link href="/forgot-password" className="block underline hover:no-underline">
                  {t('auth.requestNewLink')}
                </Link>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={auth.isLoading}>
              {auth.isLoading ? t('common.loading') : t('auth.setNewPassword')}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link href="/login" className="underline hover:no-underline">
          {t('auth.backToLogin')}
        </Link>
      </CardFooter>
    </Card>
  )
})
