import { useTranslation } from 'react-i18next'
import type { CompanyStatusEnum } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  CompanyStatusEnum,
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
}

interface Props {
  status: CompanyStatusEnum
}

export function StatusBadge({ status }: Props) {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]
  if (!config) return null
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {t(`enums.companyStatus.${status}`)}
    </Badge>
  )
}
