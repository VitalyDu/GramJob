'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import type { BlockTargetType } from '@/types/api'

interface Props {
  targetType: BlockTargetType
  targetId: number
  targetName: string
  initialIsBlocked?: boolean
}

export const BlockButton = observer(function BlockButton({
  targetType,
  targetId,
  targetName,
  initialIsBlocked = false,
}: Props) {
  const { block: store, auth } = useStores()
  const { t } = useTranslation()
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked)

  if (!auth.user) return null
  if (targetType !== 'company' && auth.user.id === targetId) return null

  const handleBlock = async () => {
    if (isBlocked) return
    if (!window.confirm(t('block.confirm'))) return
    await store.createBlock({ targetType, targetId, targetName })
    if (!store.error) {
      setIsBlocked(true)
      if (store.alreadyBlocked) {
        store.clearFlags()
      }
    }
  }

  return (
    <button
      onClick={() => void handleBlock()}
      disabled={store.isLoading || isBlocked}
      className={`text-sm transition ${
        isBlocked
          ? 'cursor-default text-muted-foreground'
          : 'text-muted-foreground hover:text-red-500'
      }`}
    >
      {isBlocked ? t('block.blocked') : t('block.block')}
    </button>
  )
})
