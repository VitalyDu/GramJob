import {
  buildNotificationTitle,
  buildNotificationData,
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
})
