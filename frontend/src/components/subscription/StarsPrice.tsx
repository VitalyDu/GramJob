import { TelegramStarIcon } from '@/components/icons/TelegramStarIcon'

export function StarsPrice({ price, className }: { price: number | null; className?: string }) {
  if (price === null || price === undefined) {
    return <span className={className}>Бесплатно</span>
  }
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      {price}
      <TelegramStarIcon className="h-4 w-4 text-amber-500" />
    </span>
  )
}
