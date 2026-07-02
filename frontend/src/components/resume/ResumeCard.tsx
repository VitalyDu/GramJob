import Link from 'next/link'
import type { Resume } from '@/types/api'
import { ResumeStatusBadge } from './ResumeStatusBadge'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'

interface Props {
  resume: Resume
  showStatus?: boolean
  href?: string
}

export function ResumeCard({ resume, showStatus = false, href }: Props) {
  const name = `${resume.firstName} ${resume.lastName}`
  const content = (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-border hover:shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100">
        <span className="text-lg font-bold text-indigo-600">
          {resume.firstName.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold text-card-foreground">{resume.title}</p>
          {showStatus && <ResumeStatusBadge status={resume.status} />}
        </div>

        <p className="mt-0.5 text-sm text-muted-foreground">{name}</p>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{resume.country}</span>
          {resume.city && <span>{resume.city}</span>}
          <span>{RESUME_WORK_FORMAT_LABELS[resume.workFormat]}</span>
          <span>{RESUME_EMPLOYMENT_TYPE_LABELS[resume.employmentType]}</span>
          {resume.experienceYears !== null && resume.experienceYears !== undefined && (
            <span>{resume.experienceYears} лет опыта</span>
          )}
        </div>

        {resume.skills && resume.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {resume.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {skill}
              </span>
            ))}
            {resume.skills.length > 5 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                +{resume.skills.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
