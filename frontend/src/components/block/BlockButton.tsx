'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import type { BlockTargetType } from '@/types/api'

interface Props {
  targetType: BlockTargetType
  targetId: number
  initialIsBlocked?: boolean
}

export const BlockButton = observer(function BlockButton({
  targetType,
  targetId,
  initialIsBlocked = false,
}: Props) {
  const { block: store, auth } = useStores()
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked)

  if (!auth.user) return null
  if (auth.user.id === targetId) return null

  const handleBlock = async () => {
    if (isBlocked) return
    if (
      !window.confirm(
        'Заблокировать этого пользователя? Его контент больше не будет отображаться в результатах поиска.'
      )
    )
      return
    await store.createBlock({ targetType, targetId })
    if (!store.error && !store.alreadyBlocked) {
      setIsBlocked(true)
    } else if (store.alreadyBlocked) {
      setIsBlocked(true)
      store.clearFlags()
    }
  }

  return (
    <button
      onClick={() => void handleBlock()}
      disabled={store.isLoading || isBlocked}
      className={`text-sm transition ${
        isBlocked ? 'cursor-default text-gray-400' : 'text-gray-500 hover:text-red-500'
      }`}
    >
      {isBlocked ? 'Заблокирован' : 'Заблокировать'}
    </button>
  )
})
