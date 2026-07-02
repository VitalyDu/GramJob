import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box, Flex, Loader, Main, Typography } from '@strapi/design-system'
import { useFetchClient } from '@strapi/strapi/admin'

interface ModerationStats {
  queue: { vacancies: number; resumes: number; companies: number; reports: number }
  avgProcessingHours: number | null
  decidedLast7Days: number
}

const cmModerationUrl = (uid: string) =>
  `/admin/content-manager/collection-types/${uid}?page=1&pageSize=20&filters[$and][0][status][$eq]=moderation`

const QUEUES: { key: keyof ModerationStats['queue']; label: string; href: string }[] = [
  { key: 'vacancies', label: 'Вакансии', href: cmModerationUrl('api::vacancy.vacancy') },
  { key: 'resumes', label: 'Резюме', href: cmModerationUrl('api::resume.resume') },
  { key: 'companies', label: 'Компании', href: cmModerationUrl('api::company.company') },
  {
    key: 'reports',
    label: 'Жалобы',
    href: '/admin/content-manager/collection-types/api::report.report?page=1&pageSize=20&filters[$and][0][status][$eq]=pending',
  },
]

const StatCard = ({ label, value, href }: { label: string; value: string; href?: string }) => (
  <Box background="neutral0" hasRadius shadow="tableShadow" padding={6} style={{ minWidth: 180 }}>
    <Typography variant="sigma" textColor="neutral600" tag="p">
      {label}
    </Typography>
    <Typography variant="alpha" tag="p">
      {value}
    </Typography>
    {href ? (
      <Typography variant="pi" tag="p">
        <a href={href}>Открыть очередь →</a>
      </Typography>
    ) : null}
  </Box>
)

const StatsPage = () => {
  const { get } = useFetchClient()
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    get('/moderation/stats')
      .then(({ data }: { data: ModerationStats }) => setStats(data))
      .catch(() => setError(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Main padding={8}>
      <Typography variant="alpha" tag="h1">
        Модерация
      </Typography>
      <Box paddingTop={6}>
        {error ? (
          <Typography textColor="danger600">Не удалось загрузить статистику</Typography>
        ) : !stats ? (
          <Loader>Загрузка…</Loader>
        ) : (
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Flex gap={4} wrap="wrap">
              {QUEUES.map((q) => (
                <StatCard
                  key={q.key}
                  label={`${q.label} в очереди`}
                  value={String(stats.queue[q.key])}
                  href={q.href}
                />
              ))}
            </Flex>
            <Flex gap={4} wrap="wrap">
              <StatCard
                label="Среднее время обработки"
                value={stats.avgProcessingHours === null ? '—' : `${stats.avgProcessingHours} ч`}
              />
              <StatCard label="Решений за 7 дней" value={String(stats.decidedLast7Days)} />
            </Flex>
          </Flex>
        )}
      </Box>
    </Main>
  )
}

export default StatsPage
