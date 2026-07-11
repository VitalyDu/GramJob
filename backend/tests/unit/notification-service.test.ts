import {
  buildNotificationTitle,
  buildNotificationData,
  stripLeadingEmoji,
} from '../../src/services/notification.service'

describe('buildNotificationTitle', () => {
  it('new_application → "Новый отклик"', () => {
    expect(buildNotificationTitle('new_application')).toBe('Новый отклик')
  })

  it('offer_received → "Получен оффер"', () => {
    expect(buildNotificationTitle('offer_received')).toBe('Получен оффер')
  })

  it('subscription_expiring → "Подписка истекает"', () => {
    expect(buildNotificationTitle('subscription_expiring')).toBe('Подписка истекает')
  })

  it('vacancy_expiring_soon → "Вакансия истекает"', () => {
    expect(buildNotificationTitle('vacancy_expiring_soon')).toBe('Вакансия истекает')
  })

  it('неизвестный тип возвращает строку', () => {
    expect(typeof buildNotificationTitle('unknown')).toBe('string')
  })

  it('moderation_approved + vacancy → "Публикация вакансии одобрена"', () => {
    expect(
      buildNotificationTitle('moderation_approved', { entityType: 'vacancy', entityId: 'v1' })
    ).toBe('Публикация вакансии одобрена')
  })

  it('moderation_approved + resume → "Публикация резюме одобрена"', () => {
    expect(
      buildNotificationTitle('moderation_approved', { entityType: 'resume', entityId: 'r1' })
    ).toBe('Публикация резюме одобрена')
  })

  it('moderation_approved + company → "Публикация компании одобрена"', () => {
    expect(
      buildNotificationTitle('moderation_approved', { entityType: 'company', entityId: 'c1' })
    ).toBe('Публикация компании одобрена')
  })

  it('moderation_rejected + vacancy → "Публикация вакансии отклонена"', () => {
    expect(
      buildNotificationTitle('moderation_rejected', { entityType: 'vacancy', entityId: 'v1' })
    ).toBe('Публикация вакансии отклонена')
  })

  it('moderation_rejected + resume → "Публикация резюме отклонена"', () => {
    expect(
      buildNotificationTitle('moderation_rejected', { entityType: 'resume', entityId: 'r1' })
    ).toBe('Публикация резюме отклонена')
  })

  it('moderation_rejected + company → "Публикация компании отклонена"', () => {
    expect(
      buildNotificationTitle('moderation_rejected', { entityType: 'company', entityId: 'c1' })
    ).toBe('Публикация компании отклонена')
  })

  it('moderation_approved без templateData → fallback строка', () => {
    expect(buildNotificationTitle('moderation_approved')).toBe('Публикация одобрена')
  })

  it('moderation_approved с неизвестным entityType → fallback строка', () => {
    expect(
      buildNotificationTitle('moderation_approved', { entityType: 'unknown_type', entityId: 'x' })
    ).toBe('Публикация одобрена')
  })
})

describe('buildNotificationData', () => {
  it('new_application строит entityType=vacancy', () => {
    const d = buildNotificationData('new_application', { vacancyId: 'abc' })
    expect(d?.entityType).toBe('vacancy')
    expect(d?.entityId).toBe('abc')
  })

  it('offer_received строит entityType=application', () => {
    const d = buildNotificationData('offer_received', { applicationId: 'x1' })
    expect(d?.entityType).toBe('application')
    expect(d?.entityId).toBe('x1')
  })

  it('subscription_expiring возвращает null (нет конкретной сущности)', () => {
    expect(buildNotificationData('subscription_expiring', {})).toBeNull()
  })

  it('moderation_approved с entityType=vacancy строит vacancy', () => {
    const d = buildNotificationData('moderation_approved', {
      entityType: 'vacancy',
      entityId: 'v1',
    })
    expect(d?.entityType).toBe('vacancy')
    expect(d?.entityId).toBe('v1')
  })

  it('moderation_rejected с entityType=company строит company', () => {
    const d = buildNotificationData('moderation_rejected', {
      entityType: 'company',
      entityId: 'c1',
    })
    expect(d?.entityType).toBe('company')
    expect(d?.entityId).toBe('c1')
  })

  it('moderation_approved с resumeId (без entityType) остаётся resume', () => {
    const d = buildNotificationData('moderation_approved', { resumeId: 'r1' })
    expect(d?.entityType).toBe('resume')
    expect(d?.entityId).toBe('r1')
  })
})

describe('stripLeadingEmoji', () => {
  it('срезает ведущее эмодзи из текста уведомления', () => {
    expect(stripLeadingEmoji('📩 Новый отклик на «X» от Ивана')).toBe(
      'Новый отклик на «X» от Ивана'
    )
  })

  it('не трогает текст без эмодзи', () => {
    expect(stripLeadingEmoji('Обычный текст')).toBe('Обычный текст')
  })
})
