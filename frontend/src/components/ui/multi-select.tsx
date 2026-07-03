'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  const toggle = (v: T) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v))
    } else {
      onChange([...value, v])
    }
  }

  const labelText =
    value.length === 0
      ? label
      : value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate">{labelText}</span>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {value.length > 1 && (
              <Badge variant="secondary" className="h-5 px-1 text-xs">
                {value.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1" align="start">
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mb-1 w-full rounded px-2 py-1 text-left text-sm text-muted-foreground hover:bg-accent"
          >
            {t('common.reset')}
          </button>
        )}
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
          >
            <div
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary',
                value.includes(opt.value) ? 'bg-primary' : 'bg-transparent'
              )}
            >
              {value.includes(opt.value) && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
