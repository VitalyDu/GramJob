import { useTranslation } from 'react-i18next'
import { TelegramStarIcon } from '@/components/icons/TelegramStarIcon'

export function StarsPrice({ price, className }: { price: number | null; className?: string }) {
  const { t } = useTranslation()
  if (price === null || price === undefined) {
    return <span className={className}>{t('subscription.starsPrice.free')}</span>
  }
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      {price}
      <TelegramStarIcon className="h-4 w-4 text-amber-500" />
    </span>
  )
}
