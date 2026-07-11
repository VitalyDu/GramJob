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
import { getCitiesForCountry } from '@/lib/cities'

interface CitySelectProps {
  country: string
  value: string
  onChange: (city: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CitySelect({
  country,
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: CitySelectProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const cities = useMemo(
    () => getCitiesForCountry(country, i18n.language),
    [country, i18n.language]
  )
  const defaultPlaceholder = placeholder ?? t('citySelect.placeholder')
  const isDisabled = disabled || !country

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          {value || defaultPlaceholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('citySelect.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('citySelect.notFound')}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  <span className="text-muted-foreground">{t('citySelect.notSpecified')}</span>
                </CommandItem>
              )}
              {cities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === city ? 'opacity-100' : 'opacity-0')}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
