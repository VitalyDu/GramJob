import { useTranslation } from 'react-i18next'
import type { VacancyStatusEnum } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  VacancyStatusEnum,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  published: {
    variant: 'default',
    className: 'bg-success text-white hover:bg-success/90',
  },
  moderation: { variant: 'secondary' },
  rejected: { variant: 'destructive' },
  draft: { variant: 'outline' },
  expired: { variant: 'outline' },
  archived: { variant: 'outline' },
}

interface Props {
  status: VacancyStatusEnum
}

export function VacancyStatusBadge({ status }: Props) {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {t(`enums.vacancyStatus.${status}`)}
    </Badge>
  )
}
