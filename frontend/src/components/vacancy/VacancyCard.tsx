import Image from 'next/image'
import Link from 'next/link'
import type { Vacancy } from '@/types/api'
import { getMediaUrl } from '@/lib/media'
import {
  WORK_FORMAT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  formatSalary,
} from '@/lib/vacancy-utils'
import { VacancyStatusBadge } from './VacancyStatusBadge'

interface Props {
  vacancy: Vacancy
}

export function VacancyCard({ vacancy }: Props) {
  const logoUrl = getMediaUrl(vacancy.company.logo?.url)
  const salary = formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.salaryCurrency)

  return (
    <Link href={`/vacancies/${vacancy.documentId}`} className="block">
      <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={vacancy.company.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-gray-400">
              {vacancy.company.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-gray-900">{vacancy.title}</p>
            <VacancyStatusBadge status={vacancy.status} />
          </div>

          <p className="mt-0.5 text-sm text-gray-500">{vacancy.company.name}</p>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
            <span>{vacancy.country}</span>
            {vacancy.city && <span>{vacancy.city}</span>}
            <span>{WORK_FORMAT_LABELS[vacancy.workFormat]}</span>
            <span>{EMPLOYMENT_TYPE_LABELS[vacancy.employmentType]}</span>
            <span>{SENIORITY_LABELS[vacancy.seniority]}</span>
          </div>

          {salary && <p className="mt-1.5 text-sm font-medium text-gray-800">{salary}</p>}

          {vacancy.urgent && (
            <span className="mt-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Urgent
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
