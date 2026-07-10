'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
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

// Static schema for type inference only
const _baseSchema = z.object({
  email: z.string().email(),
})

type FormData = z.infer<typeof _baseSchema>

export const ForgotPasswordCard = observer(function ForgotPasswordCard() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const [sent, setSent] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.validation.invalidEmail')),
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
    try {
      await auth.forgotPassword(data.email)
      setSent(true)
    } catch {
      // error сохранён в auth.error
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl">{t('auth.forgotPasswordTitle')}</CardTitle>
        <CardDescription>{t('auth.forgotPasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">{t('auth.resetEmailSent')}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            {auth.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {auth.error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={auth.isLoading}>
              {auth.isLoading ? t('common.loading') : t('auth.sendResetLink')}
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
