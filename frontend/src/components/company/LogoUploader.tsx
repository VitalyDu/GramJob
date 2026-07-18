'use client'

import { useRef, useState } from 'react'
import { Building2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { uploadFile } from '@/services/api'
import { Button } from '@/components/ui/button'

interface LogoUploaderProps {
  currentLogoUrl: string | null
  onUploadComplete: (result: { id: number; url: string }) => void
  onRemove: () => void
  disabled?: boolean
}

export function LogoUploader({
  currentLogoUrl,
  onUploadComplete,
  onRemove,
  disabled,
}: LogoUploaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const uploaded = await uploadFile(file)
      onUploadComplete(uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forms.company.logoUploadError'))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {currentLogoUrl ? (
          <img src={currentLogoUrl} alt="Logo" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void onFileChange(e)}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading
              ? t('common.loading')
              : currentLogoUrl
                ? t('forms.company.logoChange')
                : t('forms.company.logoUpload')}
          </Button>
          {currentLogoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t('common.delete')}
              disabled={disabled || isUploading}
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
