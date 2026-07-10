'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm'

const SecurityPage = observer(function SecurityPage() {
  const { t } = useTranslation()
  const { auth } = useStores()
  const router = useRouter()
  useRequireAuth()

  useEffect(() => {
    if (auth.isAuthenticated && !auth.user?.email) router.replace('/dashboard/profile')
  }, [auth.isAuthenticated, auth.user, router])

  if (!auth.user?.email) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('settings.nav.security')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  )
})

export default SecurityPage
