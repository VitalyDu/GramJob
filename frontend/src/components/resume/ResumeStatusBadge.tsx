import { useTranslation } from 'react-i18next'
import type { ResumeStatusEnum } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  ResumeStatusEnum,
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
  archived: { variant: 'outline' },
}

interface Props {
  status: ResumeStatusEnum
}

export function ResumeStatusBadge({ status }: Props) {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]
  if (!config) return null
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {t(`enums.resumeStatus.${status}`)}
    </Badge>
  )
}
