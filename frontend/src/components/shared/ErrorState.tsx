import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Что-то пошло не так', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  )
}
