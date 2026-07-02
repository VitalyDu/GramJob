import {
  buildNotificationMessage,
  APPLICATION_STATUS_TO_NOTIFICATION,
} from '../../src/api/payment/services/telegram-bot'

describe('buildNotificationMessage', () => {
  it('new_application содержит имя кандидата', () => {
    const msg = buildNotificationMessage('new_application', {
      vacancyTitle: 'Backend Dev',
      candidateName: 'Иван Иванов',
      vacancyId: 'abc123',
    })
    expect(msg.text).toContain('Backend Dev')
    expect(msg.text).toContain('Иван Иванов')
  })

  it('offer_received содержит эмодзи', () => {
    const msg = buildNotificationMessage('offer_received', {
      vacancyTitle: 'Frontend Dev',
      applicationId: 'x1',
    })
    expect(msg.text).toContain('🎉')
  })

  it('subscription_expiring содержит название плана', () => {
    const msg = buildNotificationMessage('subscription_expiring', { plan: 'Pro' })
    expect(msg.text).toContain('Pro')
    expect(msg.text).toContain('7')
  })

  it('saved_search_match содержит количество', () => {
    const msg = buildNotificationMessage('saved_search_match', {
      count: 5,
      searchType: 'vacancy',
    })
    expect(msg.text).toContain('5')
  })

  it('неизвестный тип не падает', () => {
    const msg = buildNotificationMessage('unknown_type' as any, {})
    expect(typeof msg.text).toBe('string')
  })
})

describe('APPLICATION_STATUS_TO_NOTIFICATION', () => {
  it('in-review → application_approved', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['in-review']).toBe('application_approved')
  })

  it('rejected → application_rejected', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['rejected']).toBe('application_rejected')
  })

  it('interview → interview_invitation', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['interview']).toBe('interview_invitation')
  })

  it('offer → offer_received', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['offer']).toBe('offer_received')
  })

  it('test-task → test_task', () => {
    expect(APPLICATION_STATUS_TO_NOTIFICATION['test-task']).toBe('test_task')
  })
})

describe('deep links (startapp) — контракт для Mini App роутинга', () => {
  function extractUrl(msg: ReturnType<typeof buildNotificationMessage>): string | undefined {
    const options = msg.options as Record<string, unknown> | undefined
    const markup = options?.['reply_markup'] as
      | { inline_keyboard?: Array<Array<{ url?: string }>> }
      | undefined
    return markup?.inline_keyboard?.[0]?.[0]?.url
  }

  it('new_application → startapp=vacancy_{documentId}', () => {
    const msg = buildNotificationMessage('new_application', {
      vacancyId: 'abc123doc',
      vacancyTitle: 'Frontend Dev',
      candidateName: 'Иван',
    })
    expect(extractUrl(msg)).toMatch(/\?startapp=vacancy_abc123doc$/)
  })

  it('application_approved → startapp=application_{documentId}', () => {
    const msg = buildNotificationMessage('application_approved', {
      applicationId: 'xyz456doc',
      vacancyTitle: 'Frontend Dev',
    })
    expect(extractUrl(msg)).toMatch(/\?startapp=application_xyz456doc$/)
  })

  it('offer_received → startapp=application_{documentId}', () => {
    const msg = buildNotificationMessage('offer_received', {
      applicationId: 'off789doc',
      vacancyTitle: 'Frontend Dev',
    })
    expect(extractUrl(msg)).toMatch(/\?startapp=application_off789doc$/)
  })

  it('subscription_expired → startapp=subscription', () => {
    const msg = buildNotificationMessage('subscription_expired', {})
    expect(extractUrl(msg)).toMatch(/\?startapp=subscription$/)
  })

  it('deep link ведёт на t.me с BOT_USERNAME', () => {
    const msg = buildNotificationMessage('new_application', {
      vacancyId: 'abc',
      vacancyTitle: 'X',
      candidateName: 'Y',
    })
    expect(extractUrl(msg)).toMatch(/^https:\/\/t\.me\/[A-Za-z0-9_]+\/app\?startapp=/)
  })
})
