'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, Eye, MoreVertical, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { hapticNotify } from '@/lib/telegram'
import { StatusBadge } from '@/components/company/StatusBadge'
import {
  COMPANY_SIZE_LABELS,
  canSubmitCompany,
  canDeleteCompany,
  canEditCompany,
} from '@/lib/company-utils'
import { getMediaUrl } from '@/lib/media'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { CardListSkeleton } from '@/components/shared/CardListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { EntityActionsDrawer } from '@/components/shared/EntityActionsDrawer'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'

export const MyCompaniesClient = observer(function MyCompaniesClient() {
  const { t } = useTranslation()
  const { company: store } = useStores()
  const isAuthenticated = useRequireAuth()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeCompany = activeId ? store.myCompanies.find((c) => c.documentId === activeId) : null

  useEffect(() => {
    void store.fetchMyCompanies(1)
  }, [store])

  const handleSubmit = async (id: string) => {
    await store.submitCompany(id)
    if (!store.error) {
      hapticNotify('success')
      toast.success(t('moderation.toasts.companySubmitted'))
    }
  }

  const handleDelete = (id: string) => {
    if (!window.confirm(t('dashboard.companies.confirmDelete'))) return
    void store.deleteCompany(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchMyCompanies(page)
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.companies.title')}
        description={t('dashboard.sections_list.companies.desc')}
        actions={
          <Button
            asChild
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0 rounded-full"
            aria-label={t('dashboard.companies.createNew')}
          >
            <Link href="/dashboard/companies/new">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {store.isLoading && <CardListSkeleton count={6} />}

      {store.error && !store.isLoading && (
        <ErrorState message={store.error} onRetry={() => void store.fetchMyCompanies(1)} />
      )}

      {!store.isLoading && store.myCompanies.length === 0 && !store.error && (
        <EmptyState
          icon={Building2}
          title={t('dashboard.companies.empty')}
          description={t('dashboard.companies.emptyDesc')}
          action={
            <Button asChild>
              <Link href="/dashboard/companies/new">{t('dashboard.companies.create')}</Link>
            </Button>
          }
        />
      )}

      <div className="space-y-3">
        {store.myCompanies.map((company) => {
          const logoUrl = getMediaUrl(company.logo?.url)

          return (
            <div key={company.documentId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-4">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-card-foreground">{company.name}</p>
                    <StatusBadge status={company.moderationStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {company.country}
                    {company.companySize ? ` · ${COMPANY_SIZE_LABELS[company.companySize]}` : ''}
                  </p>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  aria-label={t('actions.openActions')}
                  onClick={() => {
                    setActiveId(company.documentId)
                    setDrawerOpen(true)
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              {company.moderationStatus === 'rejected' && (
                <RejectionNotice
                  {...(company.rejectionReason != null ? { reason: company.rejectionReason } : {})}
                  {...(company.rejectionComment != null
                    ? { comment: company.rejectionComment }
                    : {})}
                  editHref={`/dashboard/companies/${company.documentId}/edit`}
                  onResubmit={() => void handleSubmit(company.documentId)}
                  resubmitDisabled={store.isLoading}
                />
              )}
            </div>
          )
        })}
      </div>

      {activeCompany && (
        <EntityActionsDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={activeCompany.name}
          statusBadge={<StatusBadge status={activeCompany.moderationStatus} />}
          actions={[
            ...(activeCompany.moderationStatus === 'published'
              ? [
                  {
                    id: 'view',
                    icon: Eye,
                    label: t('actions.view'),
                    description: t('actions.viewDesc'),
                    href: `/companies/${activeCompany.documentId}`,
                  },
                ]
              : []),
            ...(canEditCompany(activeCompany.moderationStatus)
              ? [
                  {
                    id: 'edit',
                    icon: Pencil,
                    label: t('actions.edit'),
                    description: t('actions.editDesc'),
                    href: `/dashboard/companies/${activeCompany.documentId}/edit`,
                  },
                ]
              : []),
            ...(canSubmitCompany(activeCompany.moderationStatus)
              ? [
                  {
                    id: 'submit',
                    icon: Send,
                    label: t('actions.toModeration'),
                    description: t('actions.toModerationDesc'),
                    onClick: () => void handleSubmit(activeCompany.documentId),
                    disabled: store.isLoading,
                  },
                ]
              : []),
            ...(canDeleteCompany(activeCompany.moderationStatus)
              ? [
                  {
                    id: 'delete',
                    icon: Trash2,
                    label: t('actions.delete'),
                    description: t('actions.deleteDesc'),
                    onClick: () => handleDelete(activeCompany.documentId),
                    variant: 'destructive' as const,
                    disabled: store.isLoading,
                  },
                ]
              : []),
          ]}
        />
      )}

      <PaginationBar
        page={store.page}
        pageCount={store.pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  )
})
