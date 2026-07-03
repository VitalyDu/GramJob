import type { ResumeStatusEnum } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  ResumeStatusEnum,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  published: {
    label: 'Опубликовано',
    variant: 'default',
    className: 'bg-success text-white hover:bg-success/90',
  },
  moderation: { label: 'На модерации', variant: 'secondary' },
  rejected: { label: 'Отклонено', variant: 'destructive' },
  draft: { label: 'Черновик', variant: 'outline' },
  archived: { label: 'В архиве', variant: 'outline' },
}

interface Props {
  status: ResumeStatusEnum
}

export function ResumeStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {config.label}
    </Badge>
  )
}
