'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getLanguagesList, getLanguageName } from '@/lib/languages'

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
  const [open, setOpen] = useState(false)

  const languagesList = useMemo(() => getLanguagesList(i18n.language), [i18n.language])
  const defaultPlaceholder = placeholder ?? t('languagesMultiSelect.placeholder')

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code))
    } else {
      onChange([...value, code])
    }
  }

  const triggerLabel = () => {
    if (value.length === 0) return null
    const [first, ...rest] = value
    const firstName = getLanguageName(first!, i18n.language)
    if (rest.length === 0) return firstName
    return `${firstName} +${rest.length}`
  }

  const label = triggerLabel()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className={cn(!label && 'text-muted-foreground')}>
            {label ?? defaultPlaceholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 border-b p-2">
            {value.map((code) => (
              <Badge key={code} variant="secondary" className="gap-1 pr-1">
                {getLanguageName(code, i18n.language)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(value.filter((c) => c !== code))
                  }}
                  className="rounded-sm opacity-70 hover:opacity-100"
                  aria-label={`Убрать ${getLanguageName(code, i18n.language)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Command>
          <CommandInput placeholder={t('languagesMultiSelect.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('languagesMultiSelect.notFound')}</CommandEmpty>
            <CommandGroup>
              {languagesList.map((lang) => (
                <CommandItem key={lang.code} value={lang.name} onSelect={() => toggle(lang.code)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(lang.code) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {lang.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
