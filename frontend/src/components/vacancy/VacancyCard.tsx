import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Eye, Send } from 'lucide-react'
import type { Vacancy } from '@/types/api'
import { getMediaUrl } from '@/lib/media'
import { formatSalary } from '@/lib/vacancy-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { VacancyStatusBadge } from './VacancyStatusBadge'
import { getCountryName } from '@/lib/countries'

interface Props {
  vacancy: Vacancy
}

export function VacancyCard({ vacancy }: Props) {
  const { t, i18n } = useTranslation()
  const logoUrl = getMediaUrl(vacancy.company?.logo?.url)
  const salary = formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.salaryCurrency)

  return (
    <Link href={`/vacancies/${vacancy.documentId}`} className="group block">
      <Card
        className={cn(
          'transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md',
          vacancy.highlighted && 'border-brand-orange/40 bg-brand-orange/5'
        )}
      >
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={vacancy.company?.name ?? ''}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {(vacancy.company?.name ?? '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-semibold group-hover:text-primary">{vacancy.title}</p>
              <VacancyStatusBadge status={vacancy.moderationStatus} />
            </div>

            <p className="mt-0.5 text-sm text-muted-foreground">{vacancy.company?.name}</p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">
                {vacancy.city
                  ? `${getCountryName(vacancy.country, i18n.language)}, ${vacancy.city}`
                  : getCountryName(vacancy.country, i18n.language)}
              </Badge>
              {vacancy.workFormat.map((wf) => (
                <Badge key={wf} variant="secondary">
                  {t(`enums.workFormat.${wf}`)}
                </Badge>
              ))}
              {vacancy.employmentType.map((et) => (
                <Badge key={et} variant="secondary">
                  {t(`enums.employmentType.${et}`)}
                </Badge>
              ))}
              {vacancy.seniority.map((s) => (
                <Badge key={s} variant="secondary">
                  {t(`enums.seniority.${s}`)}
                </Badge>
              ))}
              {vacancy.urgent && <Badge variant="destructive">🔥 Urgent</Badge>}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {salary ? (
                <p className="text-sm font-semibold text-foreground">{salary}</p>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {typeof vacancy.views === 'number' && (
                  <span
                    aria-label={t('cards.views', { count: vacancy.views })}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {vacancy.views}
                  </span>
                )}
                {typeof vacancy.applicationsCount === 'number' && (
                  <span
                    aria-label={t('cards.applications', { count: vacancy.applicationsCount })}
                    className="flex items-center gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {vacancy.applicationsCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
