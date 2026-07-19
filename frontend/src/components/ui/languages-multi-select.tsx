'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { getLanguagesList, getLanguageName } from '@/lib/languages'
import { cn } from '@/lib/utils'

interface LanguagesMultiSelectProps {
  value: string[]
  onChange: (codes: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function LanguagesMultiSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: LanguagesMultiSelectProps) {
  const { t, i18n } = useTranslation()
  const anchor = useComboboxAnchor()

  const languagesList = useMemo(() => getLanguagesList(i18n.language), [i18n.language])
  const defaultPlaceholder = placeholder ?? t('languagesMultiSelect.placeholder')

  return (
    <Combobox
      items={languagesList.map((l) => l.code)}
      multiple
      value={value}
      onValueChange={onChange}
      itemToStringLabel={(item) => getLanguageName(item, i18n.language)}
    >
      <ComboboxChips ref={anchor} className={cn(className)}>
        <ComboboxValue>
          {value.map((code) => (
            <ComboboxChip key={code}>{getLanguageName(code, i18n.language)}</ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput
          placeholder={value.length === 0 ? defaultPlaceholder : ''}
          disabled={disabled}
        />
        {value.length > 0 && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onChange([])
            }}
            className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            {t('common.reset')}
          </button>
        )}
      </ComboboxChips>
      <ComboboxContent anchor={anchor} align="start">
        <ComboboxEmpty>{t('languagesMultiSelect.notFound')}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {getLanguageName(item, i18n.language)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
