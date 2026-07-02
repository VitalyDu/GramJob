import type { CompanyStatusEnum } from '@/types/api'

const STATUS_CONFIG: Record<CompanyStatusEnum, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: 'bg-muted text-muted-foreground' },
  moderation: { label: 'На модерации', className: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Опубликована', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонена', className: 'bg-red-100 text-red-700' },
}

interface Props {
  status: CompanyStatusEnum
}

export function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
