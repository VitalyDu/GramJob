'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CompanyListParams, CompanySizeEnum } from '@/types/api'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { CountrySelect } from '@/components/ui/country-select'
import { CitySelect } from '@/components/ui/city-select'

interface Props {
  params: CompanyListParams
  onChange: (params: CompanyListParams) => void
}

const ALL = '__all__'

type Draft = {
  country: string
  city: string
  companySize: CompanySizeEnum | ''
}

function draftFromParams(params: CompanyListParams): Draft {
  return {
    country: params.country ?? '',
    city: params.city ?? '',
    companySize: params.companySize ?? '',
  }
}

function countActive(draft: Draft): number {
  return [draft.country, draft.city, draft.companySize].filter(Boolean).length
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="flex items-center gap-2">
      {label}
      {count > 0 && (
        <Badge variant="secondary" className="h-4.5 min-w-4.5 px-1 text-[10px] leading-none">
          {count}
        </Badge>
      )}
    </span>
  )
}

function FilterFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const { t } = useTranslation()

  return (
    <Accordion type="multiple" defaultValue={['location', 'size']}>
      <AccordionItem value="location">
        <AccordionTrigger className="px-1 py-3 text-sm hover:no-underline">
          <SectionLabel
            label={t('filters.location')}
            count={(draft.country ? 1 : 0) + (draft.city ? 1 : 0)}
          />
        </AccordionTrigger>
        <AccordionContent className="space-y-2 px-1 pb-3">
          <CountrySelect
            value={draft.country}
            onChange={(v) => setDraft({ ...draft, country: v, city: '' })}
            placeholder={t('filters.anyCountry')}
          />
          <CitySelect
            country={draft.country}
            value={draft.city}
            onChange={(v) => setDraft({ ...draft, city: v })}
            placeholder={t('filters.anyCity')}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="size">
        <AccordionTrigger className="px-1 py-3 text-sm hover:no-underline">
          <SectionLabel label={t('filters.companySize')} count={draft.companySize ? 1 : 0} />
        </AccordionTrigger>
        <AccordionContent className="px-1 pb-3">
          <Select
            value={draft.companySize || ALL}
            onValueChange={(v) =>
              setDraft({ ...draft, companySize: v === ALL ? '' : (v as CompanySizeEnum) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.anySize')}</SelectItem>
              {(Object.entries(COMPANY_SIZE_LABELS) as [CompanySizeEnum, string][]).map(
                ([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export function CompanyFilters({ params, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(draftFromParams(params))
  const [sheetOpen, setSheetOpen] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    setDraft(draftFromParams(params))
  }, [params])

  const activeCount = countActive(draftFromParams(params))

  const apply = (d: Draft = draft) => {
    const next: CompanyListParams = { page: 1 }
    if (params.search) next.search = params.search
    if (d.country) next.country = d.country
    if (d.city) next.city = d.city
    if (d.companySize) next.companySize = d.companySize
    onChange(next)
    setSheetOpen(false)
  }

  const reset = () => {
    setDraft(draftFromParams({}))
    onChange({ page: 1 })
    setSheetOpen(false)
  }

  return (
    <div>
      {/* Mobile */}
      <div className="mb-3 md:hidden">
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen} direction="bottom">
          <DrawerTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              {t('filters.title')}
              {activeCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1">{activeCount}</Badge>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('filters.title')}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4">
              <FilterFields draft={draft} setDraft={setDraft} />
            </div>
            <DrawerFooter>
              <Button onClick={() => apply()}>{t('filters.apply')}</Button>
              <Button variant="ghost" onClick={reset}>
                {t('common.reset')}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Desktop */}
      <Card className="hidden overflow-hidden md:block">
        <div className="px-4">
          <FilterFields draft={draft} setDraft={setDraft} />
        </div>
        <div className="flex flex-col gap-2 border-t p-3">
          <Button size="sm" className="w-full" onClick={() => apply()}>
            {t('filters.apply')}
          </Button>
          <Button size="sm" variant="ghost" className="w-full" onClick={reset}>
            {t('common.reset')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
