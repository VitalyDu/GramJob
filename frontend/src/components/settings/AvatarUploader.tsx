'use client'

import { useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { uploadFile } from '@/services/api'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'

export const AvatarUploader = observer(function AvatarUploader() {
  const { auth } = useStores()
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!auth.user) return null

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const uploaded = await uploadFile(file)
      await auth.updateProfile({ avatar: uploaded.url })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.profile.avatarError'))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar user={auth.user} className="h-16 w-16 text-xl" />
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void onFileChange(e)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? t('common.loading') : t('settings.profile.changeAvatar')}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
})
