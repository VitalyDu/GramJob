'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function EmailConfirmedPage() {
  const { t } = useTranslation()
  return (
    <div className="flex justify-center p-4 pt-12 sm:pt-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl">{t('auth.emailConfirmedTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">{t('auth.emailConfirmedDesc')}</p>
          <Button asChild>
            <Link href="/login">{t('auth.login')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
