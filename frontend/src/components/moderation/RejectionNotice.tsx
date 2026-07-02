import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getRejectionReasonLabel } from '@/lib/moderation-utils'

interface Props {
  reason?: string | null
  comment?: string | null
  editHref: string
  onResubmit: () => void
  resubmitDisabled?: boolean
}

export function RejectionNotice({
  reason,
  comment,
  editHref,
  onResubmit,
  resubmitDisabled,
}: Props) {
  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium text-red-800">
        Отклонено модератором: {getRejectionReasonLabel(reason)}
      </p>
      {comment && <p className="mt-1 text-sm text-red-700">Комментарий модератора: {comment}</p>}
      <p className="mt-1 text-xs text-red-600">
        Исправьте замечания и отправьте публикацию на повторную модерацию.
      </p>
      <div className="mt-2 flex gap-2">
        <Link
          href={editHref}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Исправить
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={onResubmit}
          disabled={resubmitDisabled ?? false}
        >
          Отправить повторно
        </Button>
      </div>
    </div>
  )
}
