import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { VacancyPackage, ApplyPackage } from '@/types/api'
import { StarsPrice } from '@/components/subscription/StarsPrice'

interface VacancyPackageCardProps {
  type: 'vacancy'
  pkg: VacancyPackage
  isBuying: boolean
  onBuy: (packageId: number) => void
}

interface ApplyPackageCardProps {
  type: 'apply'
  pkg: ApplyPackage
  isBuying: boolean
  onBuy: (packageId: number) => void
}

type Props = VacancyPackageCardProps | ApplyPackageCardProps

export function PackageCard(props: Props) {
  const { t } = useTranslation()
  const { pkg, isBuying, onBuy } = props

  const details =
    props.type === 'vacancy'
      ? [
          t('subscription.packageCard.vacancies', { count: props.pkg.vacancyCredits }),
          t('subscription.packageCard.boosts', { count: props.pkg.boostCredits }),
        ]
      : [t('subscription.packageCard.applies', { count: props.pkg.applyCredits })]

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-base font-semibold text-card-foreground">{pkg.name}</p>
        <p className="text-base font-bold text-card-foreground">
          <StarsPrice price={pkg.starsPrice} />
        </p>
      </div>

      <ul className="space-y-1 text-sm text-muted-foreground">
        {details.map((d, idx) => (
          <li key={idx}>• {d}</li>
        ))}
      </ul>

      <Button size="sm" className="w-full" disabled={isBuying} onClick={() => onBuy(pkg.id)}>
        {isBuying ? t('subscription.packageCard.creating') : t('subscription.packageCard.buy')}
      </Button>
    </div>
  )
}
