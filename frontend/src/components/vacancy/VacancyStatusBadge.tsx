import type { VacancyStatusEnum } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  VacancyStatusEnum,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  published: {
    label: 'Опубликована',
    variant: 'default',
    className: 'bg-success text-white hover:bg-success/90',
  },
  moderation: { label: 'На модерации', variant: 'secondary' },
  rejected: { label: 'Отклонена', variant: 'destructive' },
  draft: { label: 'Черновик', variant: 'outline' },
  expired: { label: 'Истекла', variant: 'outline' },
  archived: { label: 'В архиве', variant: 'outline' },
}

interface Props {
  status: VacancyStatusEnum
}

export function VacancyStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {config.label}
    </Badge>
  )
}
