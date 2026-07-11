'use client'

import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TelegramNotificationsToggle } from '@/components/settings/TelegramNotificationsToggle'

export default function NotificationsSettingsPage() {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('settings.nav.notifications')}</CardTitle>
      </CardHeader>
      <CardContent>
        <TelegramNotificationsToggle />
      </CardContent>
    </Card>
  )
}
