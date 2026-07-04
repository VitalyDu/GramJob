import { useTranslation } from 'react-i18next'
import type { ApplicationStatusEnum } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  ApplicationStatusEnum,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  applied: { variant: 'secondary' },
  viewed: { variant: 'secondary' },
  'in-review': { variant: 'secondary' },
  interview: { variant: 'default' },
  'test-task': { variant: 'default' },
  offer: {
    variant: 'default',
    className: 'bg-success text-white hover:bg-success/90',
  },
  hired: {
    variant: 'default',
    className: 'bg-success text-white hover:bg-success/90',
  },
  rejected: { variant: 'destructive' },
}

interface Props {
  status: ApplicationStatusEnum
}

export function ApplicationStatusBadge({ status }: Props) {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {t(`enums.applicationStatus.${status}`)}
    </Badge>
  )
}
