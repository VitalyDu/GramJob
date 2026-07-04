'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SavedSearchType, SavedSearchFilters } from '@/types/api'

interface Props {
  searchType: SavedSearchType
  filters: SavedSearchFilters
}

export const SaveSearchButton = observer(function SaveSearchButton({ searchType, filters }: Props) {
  const { savedSearch: store, auth } = useStores()
  const { t } = useTranslation()
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
    return <span className="text-sm text-success">{t('savedSearch.saved')}</span>
  }

  if (showForm) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('savedSearch.namePlaceholder')}
            className="h-8 text-sm"
          />
          <Button onClick={() => void handleSave()} disabled={store.isLoading} size="sm">
            {store.isLoading ? '...' : t('common.save')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowForm(false)
              setName('')
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
        {store.error && <p className="text-xs text-destructive">{store.error}</p>}
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
      {t('common.saveSearch')}
    </Button>
  )
})
