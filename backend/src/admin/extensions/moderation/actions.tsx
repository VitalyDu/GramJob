import * as React from 'react'
import { useState } from 'react'
import {
  Button,
  Field,
  Flex,
  Modal,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  Typography,
} from '@strapi/design-system'
import { getFetchClient } from '@strapi/strapi/admin'

const REJECTION_REASONS: { value: string; label: string }[] = [
  { value: 'spam', label: 'Спам или дублирующийся контент' },
  { value: 'fake', label: 'Фиктивная вакансия/компания' },
  { value: 'inappropriate', label: 'Неприемлемый контент' },
  { value: 'incomplete', label: 'Недостаточно информации' },
  { value: 'wrong_category', label: 'Неправильная категория' },
  { value: 'salary_mismatch', label: 'Некорректные данные о зарплате' },
  { value: 'contact_info', label: 'Контактные данные в запрещённых полях' },
  { value: 'other', label: 'Другое (обязателен комментарий)' },
]

const MODERATED_MODELS: Record<string, string> = {
  'api::vacancy.vacancy': 'vacancy',
  'api::resume.resume': 'resume',
  'api::company.company': 'company',
}

interface ActionProps {
  model: string
  documentId?: string
  document?: { moderationStatus?: string; status?: string } & Record<string, unknown>
}

export const ApproveAction = ({ model, documentId, document }: ActionProps) => {
  const entityType = MODERATED_MODELS[model]
  if (!entityType || !documentId || document?.moderationStatus !== 'moderation') return null

  return {
    label: 'Одобрить',
    variant: 'success' as const,
    position: ['panel' as const],
    dialog: {
      type: 'dialog' as const,
      title: 'Одобрить публикацию?',
      content: 'Статус изменится на published, пользователь получит уведомление.',
      onConfirm: async () => {
        const { post } = getFetchClient()
        await post(`/moderation/${entityType}/${documentId}/approve`)
        window.location.reload()
      },
    },
  }
}

const RejectForm = ({
  entityType,
  documentId,
  onClose,
}: {
  entityType: string
  documentId: string
  onClose: () => void
}) => {
  const [reason, setReason] = useState('spam')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (reason === 'other' && comment.trim() === '') {
      setError('Для причины «Другое» комментарий обязателен')
      return
    }
    setSubmitting(true)
    try {
      const { post } = getFetchClient()
      await post(`/moderation/${entityType}/${documentId}/reject`, {
        reason,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      })
      onClose()
      window.location.reload()
    } catch {
      setError('Не удалось отклонить. Попробуйте ещё раз.')
      setSubmitting(false)
    }
  }

  return (
    <Modal.Body>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Field.Root>
          <Field.Label>Причина отклонения</Field.Label>
          <SingleSelect value={reason} onChange={(v: string | number) => setReason(String(v))}>
            {REJECTION_REASONS.map((r) => (
              <SingleSelectOption key={r.value} value={r.value}>
                {r.label}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Field.Root>
        <Field.Root>
          <Field.Label>Комментарий (виден пользователю)</Field.Label>
          <Textarea
            value={comment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
          />
        </Field.Root>
        {error ? <Typography textColor="danger600">{error}</Typography> : null}
        <Flex justifyContent="flex-end" gap={2}>
          <Button variant="tertiary" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button variant="danger" onClick={submit} loading={submitting}>
            Отклонить
          </Button>
        </Flex>
      </Flex>
    </Modal.Body>
  )
}

export const RejectAction = ({ model, documentId, document }: ActionProps) => {
  const entityType = MODERATED_MODELS[model]
  if (!entityType || !documentId || document?.moderationStatus !== 'moderation') return null

  return {
    label: 'Отклонить',
    variant: 'danger' as const,
    position: ['panel' as const],
    dialog: {
      type: 'modal' as const,
      title: 'Отклонить публикацию',
      content: ({ onClose }: { onClose: () => void }) => (
        <RejectForm entityType={entityType} documentId={documentId} onClose={onClose} />
      ),
    },
  }
}

const REPORT_MODEL = 'api::report.report'

export const ResolveReportAction = ({ model, documentId, document }: ActionProps) => {
  if (model !== REPORT_MODEL || !documentId || document?.status !== 'pending') return null

  return {
    label: 'Жалоба подтверждена',
    variant: 'success' as const,
    position: ['panel' as const],
    dialog: {
      type: 'dialog' as const,
      title: 'Подтвердить жалобу?',
      content:
        'Статус жалобы станет resolved. Действие над сущностью (отклонение) выполните отдельно на её странице.',
      onConfirm: async () => {
        const { post } = getFetchClient()
        await post(`/moderation/reports/${documentId}/resolve`)
        window.location.reload()
      },
    },
  }
}

export const DismissReportAction = ({ model, documentId, document }: ActionProps) => {
  if (model !== REPORT_MODEL || !documentId || document?.status !== 'pending') return null

  return {
    label: 'Отклонить жалобу',
    variant: 'danger' as const,
    position: ['panel' as const],
    dialog: {
      type: 'dialog' as const,
      title: 'Отклонить жалобу?',
      content: 'Статус жалобы станет dismissed, сущность останется без изменений.',
      onConfirm: async () => {
        const { post } = getFetchClient()
        await post(`/moderation/reports/${documentId}/dismiss`)
        window.location.reload()
      },
    },
  }
}
