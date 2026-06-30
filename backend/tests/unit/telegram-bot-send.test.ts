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
