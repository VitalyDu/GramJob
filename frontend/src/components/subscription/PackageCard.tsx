import { formatStarsPrice } from '@/lib/subscription-utils'
import { Button } from '@/components/ui/button'
import type { VacancyPackage, ApplyPackage } from '@/types/api'

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
  const { pkg, isBuying, onBuy } = props

  const details =
    props.type === 'vacancy'
      ? [`${props.pkg.vacancyCredits} вакансий`, `${props.pkg.boostCredits} буст-кредитов`]
      : [`${props.pkg.applyCredits} откликов`]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-base font-semibold text-gray-900">{pkg.name}</p>
        <p className="text-sm font-bold text-indigo-600">{formatStarsPrice(pkg.starsPrice)}</p>
      </div>

      <ul className="space-y-1 text-sm text-gray-600">
        {details.map((d) => (
          <li key={d}>• {d}</li>
        ))}
      </ul>

      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={isBuying}
        onClick={() => {
          onBuy(pkg.id)
        }}
      >
        {isBuying ? 'Создание счёта...' : 'Купить'}
      </Button>
    </div>
  )
}
