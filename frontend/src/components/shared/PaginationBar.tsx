import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

export function PaginationBar({ page, pageCount, onPageChange }: Props) {
  const { t } = useTranslation()
  if (pageCount <= 1) return null

  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, i) => start + i)

  return (
    <nav
      aria-label={t('shared.pagination')}
      className="mt-6 flex items-center justify-center gap-1"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('shared.prevPage')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'ghost'}
          size="icon"
          className={cn('h-9 w-9', p === page && 'pointer-events-none')}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPageChange(p)}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('shared.nextPage')}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}
