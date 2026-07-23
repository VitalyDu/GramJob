'use client'

import { useTonPayment } from '@/hooks/useTonPayment'
import { formatUsdt, calculateUsdtDisplayAmount } from '@/lib/ton'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import type { TonPaymentKind } from '@/types/api'
import { TonPaymentStatusDialog } from './TonPaymentStatusDialog'

export interface TonPaymentButtonProps {
  starsPrice: number
  kind: TonPaymentKind
  planCode?: string
  packageId?: number
  vacancyId?: string
  onSuccess?: () => void | Promise<void>
  className?: string
}

export function TonPaymentButton(props: TonPaymentButtonProps) {
  const { t } = useTranslation()
  const { phase, error, pay, reset } = useTonPayment()
  const usdt = calculateUsdtDisplayAmount(props.starsPrice)
  const isLoading = phase !== 'idle' && phase !== 'success' && phase !== 'error'

  const handleClick = () => {
    void pay(
      props.kind,
      {
        ...(props.planCode !== undefined ? { planCode: props.planCode } : {}),
        ...(props.packageId !== undefined ? { packageId: props.packageId } : {}),
        ...(props.vacancyId !== undefined ? { vacancyId: props.vacancyId } : {}),
      },
      props.onSuccess
    )
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isLoading}
        className={props.className}
      >
        {t('tonPayment.payWithUsdt', { amount: formatUsdt(usdt) })}
      </Button>
      <TonPaymentStatusDialog
        phase={phase}
        {...(error !== null ? { error } : {})}
        onClose={reset}
      />
    </>
  )
}
