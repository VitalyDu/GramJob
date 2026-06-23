import schema from '../../src/extensions/users-permissions/content-types/user/schema.json'

describe('User schema extension', () => {
  it('contains telegramId field', () => {
    expect(schema.attributes.telegramId).toEqual({
      type: 'string',
      unique: true,
    })
  })

  it('contains subscriptionPlan field with correct enum', () => {
    expect(schema.attributes.subscriptionPlan).toMatchObject({
      type: 'enumeration',
      enum: ['free', 'pro', 'max', 'vip'],
      default: 'free',
    })
  })

  it('contains vacancyCredits field', () => {
    expect(schema.attributes.vacancyCredits).toMatchObject({
      type: 'integer',
      default: 0,
    })
  })

  it('contains applyCredits field', () => {
    expect(schema.attributes.applyCredits).toMatchObject({
      type: 'integer',
      default: 0,
    })
  })

  it('contains language field', () => {
    expect(schema.attributes.language).toMatchObject({
      type: 'enumeration',
      enum: ['ru', 'en'],
      default: 'ru',
    })
  })

  it('contains subscriptionExpiresAt field', () => {
    expect(schema.attributes.subscriptionExpiresAt).toEqual({
      type: 'datetime',
    })
  })
})
