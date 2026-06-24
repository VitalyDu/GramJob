import type { VacancyStatusEnum } from '@/types/api'

const STATUS_CONFIG: Record<VacancyStatusEnum, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: 'bg-gray-100 text-gray-600' },
  moderation: { label: 'На модерации', className: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Опубликована', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонена', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Истекла', className: 'bg-orange-100 text-orange-700' },
  archived: { label: 'В архиве', className: 'bg-slate-100 text-slate-600' },
}

interface Props {
  status: VacancyStatusEnum
}

export function VacancyStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
