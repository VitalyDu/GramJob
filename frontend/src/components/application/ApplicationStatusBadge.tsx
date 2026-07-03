import type { ApplicationStatusEnum } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  ApplicationStatusEnum,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  applied: { label: 'Отправлен', variant: 'secondary' },
  viewed: { label: 'Просмотрен', variant: 'secondary' },
  'in-review': { label: 'На рассмотрении', variant: 'secondary' },
  interview: { label: 'Собеседование', variant: 'default' },
  'test-task': { label: 'Тестовое', variant: 'default' },
  offer: {
    label: 'Оффер',
    variant: 'default',
    className: 'bg-success text-white hover:bg-success/90',
  },
  hired: {
    label: 'Принят',
    variant: 'default',
    className: 'bg-success text-white hover:bg-success/90',
  },
  rejected: { label: 'Отклонён', variant: 'destructive' },
}

interface Props {
  status: ApplicationStatusEnum
}

export function ApplicationStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {config.label}
    </Badge>
  )
}
