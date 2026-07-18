import { computeTelegramUsernameUpdate } from '../../src/api/telegram-auth/services/telegram-user-sync'

describe('computeTelegramUsernameUpdate', () => {
  it('впервые заполняет пустое поле из Telegram username', () => {
    expect(computeTelegramUsernameUpdate(null, 'vitaly')).toEqual({
      needsUpdate: true,
      value: 'vitaly',
    })
    expect(computeTelegramUsernameUpdate(undefined, 'vitaly')).toEqual({
      needsUpdate: true,
      value: 'vitaly',
    })
  })

  it('обновляет при смене username в Telegram', () => {
    expect(computeTelegramUsernameUpdate('oldname', 'newname')).toEqual({
      needsUpdate: true,
      value: 'newname',
    })
  })

  it('обнуляет поле, если пользователь удалил свой @username в Telegram', () => {
    expect(computeTelegramUsernameUpdate('oldname', undefined)).toEqual({
      needsUpdate: true,
      value: null,
    })
    expect(computeTelegramUsernameUpdate('oldname', null)).toEqual({
      needsUpdate: true,
      value: null,
    })
    expect(computeTelegramUsernameUpdate('oldname', '')).toEqual({
      needsUpdate: true,
      value: null,
    })
  })

  it('не помечает нужным обновление, если ничего не изменилось', () => {
    expect(computeTelegramUsernameUpdate('vitaly', 'vitaly')).toEqual({
      needsUpdate: false,
      value: 'vitaly',
    })
    expect(computeTelegramUsernameUpdate(null, undefined)).toEqual({
      needsUpdate: false,
      value: null,
    })
    expect(computeTelegramUsernameUpdate(null, null)).toEqual({
      needsUpdate: false,
      value: null,
    })
    expect(computeTelegramUsernameUpdate(undefined, '')).toEqual({
      needsUpdate: false,
      value: null,
    })
  })

  it('различает регистр (Telegram username case-sensitive для отображения)', () => {
    expect(computeTelegramUsernameUpdate('Vitaly', 'vitaly')).toEqual({
      needsUpdate: true,
      value: 'vitaly',
    })
  })
})
