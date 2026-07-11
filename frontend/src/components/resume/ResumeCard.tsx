import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { Resume } from '@/types/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getCountryName } from '@/lib/countries'
import { ResumeStatusBadge } from './ResumeStatusBadge'

interface Props {
  resume: Resume
}

export function ResumeCard({ resume }: Props) {
  const { t, i18n } = useTranslation()
  const initials =
    [resume.firstName, resume.lastName]
      .filter(Boolean)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || '?'

  const skills = Array.isArray(resume.skills) ? (resume.skills as string[]) : []
  const visibleSkills = skills.slice(0, 5)
  const extraCount = skills.length - visibleSkills.length

  return (
    <Link href={`/resumes/${resume.documentId}`} className="group block">
      <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-4">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-semibold group-hover:text-primary">{resume.title}</p>
              <ResumeStatusBadge status={resume.moderationStatus} />
            </div>
            {(resume.firstName || resume.lastName) && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {[resume.firstName, resume.lastName].filter(Boolean).join(' ')}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {resume.country && (
                <Badge variant="secondary">
                  {resume.city
                    ? `${getCountryName(resume.country, i18n.language)}, ${resume.city}`
                    : getCountryName(resume.country, i18n.language)}
                </Badge>
              )}
              {resume.workFormat?.map((wf) => (
                <Badge key={wf} variant="secondary">
                  {t(`enums.resumeWorkFormat.${wf}`)}
                </Badge>
              ))}
              {resume.employmentType?.map((et) => (
                <Badge key={et} variant="secondary">
                  {t(`enums.employmentType.${et}`)}
                </Badge>
              ))}
              {visibleSkills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
              {extraCount > 0 && <Badge variant="outline">+{extraCount}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
