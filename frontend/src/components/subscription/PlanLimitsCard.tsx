'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Card, CardContent } from '@/components/ui/card'
import { UsageLimitBar } from '@/components/shared/UsageLimitBar'

export const PlanLimitsCard = observer(function PlanLimitsCard() {
  const { limits } = useStores()
  const { t } = useTranslation()

  useEffect(() => {
    void limits.fetchLimits()
  }, [limits])

  if (!limits.data && !limits.isLoading) return null
  if (!limits.data) return null

  const { applications, resumes, vacancyCreations, activeVacancies } = limits.data

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <UsageLimitBar
          label={t('limits.applications.label')}
          used={applications.used}
          limit={applications.limit}
          resetsAt={applications.resetsAt}
        />
        <UsageLimitBar
          label={t('limits.resumes.label')}
          used={resumes.used}
          limit={resumes.limit}
        />
        <UsageLimitBar
          label={t('limits.vacancyCreations.label')}
          used={vacancyCreations.used}
          limit={vacancyCreations.limit}
          resetsAt={vacancyCreations.resetsAt}
        />
        <UsageLimitBar
          label={t('limits.activeVacancies.label')}
          used={activeVacancies.used}
          limit={activeVacancies.limit}
        />
      </CardContent>
    </Card>
  )
})
