'use client'

import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AvatarUploader } from '@/components/settings/AvatarUploader'
import { ProfileSettingsForm } from '@/components/settings/ProfileSettingsForm'
import { TelegramNotificationsToggle } from '@/components/settings/TelegramNotificationsToggle'

export const ProfileClient = observer(function ProfileClient() {
  const { t } = useTranslation()
  const { auth } = useStores()
  useRequireAuth()

  if (!auth.user) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.nav.profile')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AvatarUploader />
          <ProfileSettingsForm />
          <TelegramNotificationsToggle />
        </CardContent>
      </Card>
    </div>
  )
})
