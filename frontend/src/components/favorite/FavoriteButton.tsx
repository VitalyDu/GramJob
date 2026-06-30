'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import type { FavoriteType } from '@/types/api'

interface Props {
  type: FavoriteType
  targetId: string
  initialIsFavorited?: boolean
}

export const FavoriteButton = observer(function FavoriteButton({
  type,
  targetId,
  initialIsFavorited = false,
}: Props) {
  const { favorite: store, auth } = useStores()
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)

  if (!auth.user) return null

  const handleToggle = async () => {
    if (isFavorited) {
      try {
        await store.removeFavorite(type, targetId)
        setIsFavorited(false)
      } catch {
        // error shown via store.error
      }
    } else {
      try {
        await store.addFavorite({ type, targetId })
        if (!store.error) {
          setIsFavorited(true)
          store.clearFlags()
        }
      } catch {
        // error shown via store.error
      }
    }
  }

  return (
    <button
      onClick={() => void handleToggle()}
      disabled={store.isLoading}
      title={isFavorited ? 'Убрать из избранного' : 'Добавить в избранное'}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
        isFavorited
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {isFavorited ? '★ В избранном' : '☆ В избранное'}
    </button>
  )
})
