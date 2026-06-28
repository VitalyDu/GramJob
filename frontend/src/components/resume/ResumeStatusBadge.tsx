import type { ResumeStatusEnum } from '@/types/api'

const STATUS_CONFIG: Record<ResumeStatusEnum, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: 'bg-gray-100 text-gray-600' },
  moderation: { label: 'На модерации', className: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Опубликовано', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонено', className: 'bg-red-100 text-red-700' },
  archived: { label: 'В архиве', className: 'bg-slate-100 text-slate-600' },
}

interface Props {
  status: ResumeStatusEnum
}

export function ResumeStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
