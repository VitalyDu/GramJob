'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getCountriesList, getCountryName } from '@/lib/countries'

interface CountrySelectProps {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CountrySelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: CountrySelectProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const countriesList = useMemo(() => getCountriesList(i18n.language), [i18n.language])
  const defaultPlaceholder = placeholder ?? t('countrySelect.placeholder')

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
          {value ? getCountryName(value, i18n.language) : defaultPlaceholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('countrySelect.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('countrySelect.notFound')}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  <span className="text-muted-foreground">{t('countrySelect.notSpecified')}</span>
                </CommandItem>
              )}
              {countriesList.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === country.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
