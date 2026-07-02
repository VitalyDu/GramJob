'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStores } from '@/stores/StoreProvider'
import { StatusBadge } from '@/components/company/StatusBadge'
import { COMPANY_SIZE_LABELS, canSubmitCompany, canDeleteCompany } from '@/lib/company-utils'
import { getMediaUrl } from '@/lib/media'
import { Button } from '@/components/ui/button'
import { RejectionNotice } from '@/components/moderation/RejectionNotice'

export const MyCompaniesClient = observer(function MyCompaniesClient() {
  const { t } = useTranslation()
  const { company: store } = useStores()

  useEffect(() => {
    void store.fetchMyCompanies(1)
  }, [store])

  const handleSubmit = async (id: string) => {
    await store.submitCompany(id)
    if (!store.error) {
      toast.success(t('moderation.toasts.companySubmitted'))
    }
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Удалить компанию? Это действие нельзя отменить.')) return
    void store.deleteCompany(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchMyCompanies(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои компании</h1>
        <Link
          href="/dashboard/companies/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Создать компанию
        </Link>
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.myCompanies.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">У вас пока нет компаний.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.myCompanies.map((company) => {
          const logoUrl = getMediaUrl(company.logo?.url)

          return (
            <div
              key={company.documentId}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={company.name}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-gray-400">
                      {company.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-gray-900">{company.name}</p>
                    <StatusBadge status={company.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {company.country} · {COMPANY_SIZE_LABELS[company.companySize]}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/dashboard/companies/${company.documentId}/edit`}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Редактировать
                  </Link>

                  {canSubmitCompany(company.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSubmit(company.documentId)}
                      disabled={store.isLoading}
                    >
                      На модерацию
                    </Button>
                  )}

                  {canDeleteCompany(company.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(company.documentId)}
                      disabled={store.isLoading}
                    >
                      Удалить
                    </Button>
                  )}
                </div>
              </div>
              {company.status === 'rejected' && (
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

      {store.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={store.page <= 1}
            onClick={() => handlePageChange(store.page - 1)}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {store.page} / {store.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={store.page >= store.pageCount}
            onClick={() => handlePageChange(store.page + 1)}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
