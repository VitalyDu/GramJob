'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CompanyListParams, CompanySizeEnum } from '@/types/api'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { CountrySelect } from '@/components/ui/country-select'

interface Props {
  params: CompanyListParams
  onChange: (params: CompanyListParams) => void
}

const ALL = '__all__'

type Draft = {
  country: string
  companySize: CompanySizeEnum | ''
}

function draftFromParams(params: CompanyListParams): Draft {
  return {
    country: params.country ?? '',
    companySize: params.companySize ?? '',
  }
}

function countActive(draft: Draft): number {
  return [draft.country, draft.companySize].filter(Boolean).length
}

function FilterFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('filters.country')}</Label>
        <CountrySelect
          value={draft.country}
          onChange={(v) => setDraft({ ...draft, country: v })}
          placeholder={t('filters.anyCountry')}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('filters.companySize')}</Label>
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
            {(Object.entries(COMPANY_SIZE_LABELS) as [CompanySizeEnum, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
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
      <div className="mb-3 md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              {t('filters.title')}
              {activeCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1">{activeCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>{t('filters.title')}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-2">
              <FilterFields draft={draft} setDraft={setDraft} />
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                {t('common.reset')}
              </Button>
              <Button className="flex-1" onClick={() => apply()}>
                {t('filters.apply')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="hidden md:block">
        <CardContent>
          <FilterFields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => apply()}>
              {t('filters.apply')}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              {t('common.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
