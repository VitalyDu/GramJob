'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export const TelegramNotificationsToggle = observer(function TelegramNotificationsToggle() {
  const { auth } = useStores()
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)

  if (!auth.user?.telegramId) return null

  const enabled = auth.user.telegramNotificationsEnabled !== false

  const toggle = async (checked: boolean) => {
    setIsSaving(true)
    try {
      await auth.updateProfile({ telegramNotificationsEnabled: checked })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="tg-notifications"
        checked={enabled}
        disabled={isSaving}
        onCheckedChange={(checked) => void toggle(checked === true)}
      />
      <Label htmlFor="tg-notifications" className="cursor-pointer">
        {t('settings.profile.telegramNotifications')}
      </Label>
    </div>
  )
})
