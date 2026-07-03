'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { EmailRegisterForm } from '@/components/auth/EmailRegisterForm'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

export function RegisterCard() {
  const { t } = useTranslation()
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <Image
          src="/logo-vertical.png"
          alt="GramJob"
          width={120}
          height={120}
          priority
          className="mx-auto"
        />
        <CardTitle className="mt-4 text-2xl">{t('auth.registerTitle')}</CardTitle>
        <CardDescription>{t('auth.registerDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <EmailRegisterForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t('auth.hasAccount')}{' '}
        <Link href="/login" className="ml-1 underline hover:no-underline">
          {t('auth.login')}
        </Link>
      </CardFooter>
    </Card>
  )
}
