import Image from 'next/image'
import Link from 'next/link'
import type { Company } from '@/types/api'
import { getMediaUrl } from '@/lib/media'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  company: Company
}

export function CompanyCard({ company }: Props) {
  const logoUrl = getMediaUrl(company.logo?.url)

  return (
    <Link href={`/companies/${company.documentId}`} className="group block">
      <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={company.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {company.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold group-hover:text-primary">{company.name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {company.country && <Badge variant="secondary">{company.country}</Badge>}
              {company.companySize && (
                <Badge variant="secondary">{COMPANY_SIZE_LABELS[company.companySize]}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
