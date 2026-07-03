'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, MessageCircle, Linkedin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '@/stores/StoreProvider'
import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'
import { StatusBadge } from '@/components/company/StatusBadge'
import { FavoriteButton } from '@/components/favorite/FavoriteButton'
import { ReportDialog } from '@/components/report/ReportDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardListSkeleton, ErrorState } from '@/components/shared'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { getCountryName } from '@/lib/countries'
import { getMediaUrl } from '@/lib/media'

interface Props {
  id: string
}

export const CompanyDetailClient = observer(function CompanyDetailClient({ id }: Props) {
  useTelegramBackButton()
  const { company: store, auth } = useStores()
  const { t } = useTranslation()
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    void store.fetchCompanyById(id)
  }, [store, id])

  if (store.isLoading) {
    return <CardListSkeleton count={3} />
  }

  if (store.error || !store.currentCompany) {
    return (
      <ErrorState
        message={store.error ?? t('companyDetail.notFound')}
        onRetry={() => void store.fetchCompanyById(id)}
      />
    )
  }

  const company = store.currentCompany
  const logoUrl = getMediaUrl(company.logo?.url)
  const coverUrl = getMediaUrl(company.cover?.url)

  return (
    <div className="space-y-4">
      {/* Cover image */}
      {coverUrl && (
        <div className="relative h-48 w-full overflow-hidden rounded-xl bg-muted">
          <Image src={coverUrl} alt="" fill className="object-cover" />
        </div>
      )}

      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={company.name}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-card-foreground">{company.name}</h1>
                <StatusBadge status={company.status} />
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {company.country && (
                  <Badge variant="secondary">{getCountryName(company.country)}</Badge>
                )}
                {company.city && <Badge variant="secondary">{company.city}</Badge>}
                <Badge variant="outline">{COMPANY_SIZE_LABELS[company.companySize]}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {company.website && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </Button>
                )}
                {company.telegram && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://t.me/${company.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                      {company.telegram}
                    </a>
                  </Button>
                )}
                {company.linkedin && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={company.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="mr-1.5 h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>

              {auth.user && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <FavoriteButton type="company" targetId={id} />
                  <button
                    onClick={() => setReportOpen(true)}
                    className="text-sm text-muted-foreground hover:text-destructive"
                  >
                    {t('companyDetail.report')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {company.description && (
        <Card>
          <CardHeader>
            <CardTitle>{t('companyDetail.about')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground">{company.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="border-t pt-4">
        <Link href="/companies" className="text-sm text-muted-foreground hover:text-foreground">
          {t('companyDetail.backToAll')}
        </Link>
      </div>

      <ReportDialog
        type="company"
        targetId={id}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
})
