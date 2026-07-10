'use client'

import { useTranslation } from 'react-i18next'
import { InterfaceSettings } from '@/components/settings/InterfaceSettings'

export default function InterfacePage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-muted-foreground">
        {t('settings.nav.interface')}
      </h2>
      <InterfaceSettings />
    </div>
  )
}
