import Image from 'next/image'
import Link from 'next/link'
import type { Company } from '@/types/api'
import { getMediaUrl } from '@/lib/media'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { StatusBadge } from './StatusBadge'

interface Props {
  company: Company
}

export function CompanyCard({ company }: Props) {
  const logoUrl = getMediaUrl(company.logo?.url)

  return (
    <Link href={`/companies/${company.documentId}`} className="block">
      <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-border hover:shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={company.name}
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">
              {company.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-card-foreground">{company.name}</p>
            <StatusBadge status={company.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{company.country}</span>
            <span>{COMPANY_SIZE_LABELS[company.companySize]}</span>
            {company.city && <span>{company.city}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
