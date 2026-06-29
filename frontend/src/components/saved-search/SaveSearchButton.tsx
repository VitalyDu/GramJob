'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import type { SavedSearchType, SavedSearchFilters } from '@/types/api'

interface Props {
  searchType: SavedSearchType
  filters: SavedSearchFilters
}

export const SaveSearchButton = observer(function SaveSearchButton({ searchType, filters }: Props) {
  const { savedSearch: store, auth } = useStores()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)

  if (!auth.user) return null

  const handleSave = async () => {
    try {
      await store.createSavedSearch({
        type: searchType,
        filters,
        ...(name.trim() ? { name: name.trim() } : {}),
      })
      setSaved(true)
      setShowForm(false)
      setName('')
    } catch {
      // store.error is set by the store — user can retry
    }
  }

  if (saved) {
    return <span className="text-sm text-green-600">Поиск сохранён ✓</span>
  }

  if (showForm) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название (необязательно)"
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => void handleSave()}
          disabled={store.isLoading}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {store.isLoading ? '...' : 'Сохранить'}
        </button>
        <button
          onClick={() => {
            setShowForm(false)
            setName('')
          }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Отмена
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
    >
      Сохранить поиск
    </button>
  )
})
