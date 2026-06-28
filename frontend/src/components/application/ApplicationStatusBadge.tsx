import type { ApplicationStatusEnum } from '@/types/api'

const STATUS_CONFIG: Record<ApplicationStatusEnum, { label: string; className: string }> = {
  applied: { label: 'Отправлен', className: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Просмотрен', className: 'bg-gray-100 text-gray-600' },
  'in-review': { label: 'На рассмотрении', className: 'bg-yellow-100 text-yellow-700' },
  interview: { label: 'Собеседование', className: 'bg-indigo-100 text-indigo-700' },
  'test-task': { label: 'Тестовое', className: 'bg-purple-100 text-purple-700' },
  offer: { label: 'Оффер', className: 'bg-emerald-100 text-emerald-700' },
  hired: { label: 'Принят', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонён', className: 'bg-red-100 text-red-700' },
}

interface Props {
  status: ApplicationStatusEnum
}

export function ApplicationStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
