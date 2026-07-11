'use client'

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
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
}

interface MultiSelectProps<T extends string> {
  label: string
  options: Option<T>[]
  value: T[]
  onChange: (values: T[]) => void
  className?: string
}

export function MultiSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: MultiSelectProps<T>) {
  const { t } = useTranslation()
  const anchor = useComboboxAnchor()

  const labelMap = new Map(options.map((o) => [o.value as string, o.label]))

  return (
    <Combobox
      items={options.map((o) => o.value as string)}
      multiple
      value={value as string[]}
      onValueChange={(v) => onChange(v as T[])}
      itemToStringLabel={(item) => labelMap.get(item as string) ?? String(item)}
    >
      <ComboboxChips ref={anchor} className={cn(className)}>
        <ComboboxValue>
          {value.map((v) => (
            <ComboboxChip key={v}>{labelMap.get(v as string) ?? v}</ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput placeholder={value.length === 0 ? label : ''} />
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
        <ComboboxEmpty>{t('countrySelect.notFound')}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {labelMap.get(item) ?? item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
