import {
  canTransitionTo,
  STATUS_TRANSITIONS,
} from '../../src/api/application/services/application-utils'

describe('STATUS_TRANSITIONS', () => {
  it('has entries for all application statuses', () => {
    const expectedStatuses = [
      'applied',
      'viewed',
      'in-review',
      'interview',
      'test-task',
      'offer',
      'hired',
      'rejected',
    ]
    for (const status of expectedStatuses) {
      expect(STATUS_TRANSITIONS).toHaveProperty(status)
    }
  })
})

describe('canTransitionTo', () => {
  it('allows applied → viewed', () => {
    expect(canTransitionTo('applied', 'viewed')).toBe(true)
  })

  it('blocks applied → in-review (must go through viewed first)', () => {
    expect(canTransitionTo('applied', 'in-review')).toBe(false)
  })

  it('allows viewed → in-review', () => {
    expect(canTransitionTo('viewed', 'in-review')).toBe(true)
  })

  it('blocks viewed → interview (must go through in-review first)', () => {
    expect(canTransitionTo('viewed', 'interview')).toBe(false)
  })

  it('allows in-review → interview', () => {
    expect(canTransitionTo('in-review', 'interview')).toBe(true)
  })

  it('allows in-review → test-task', () => {
    expect(canTransitionTo('in-review', 'test-task')).toBe(true)
  })

  it('allows in-review → offer', () => {
    expect(canTransitionTo('in-review', 'offer')).toBe(true)
  })

  it('allows in-review → rejected', () => {
    expect(canTransitionTo('in-review', 'rejected')).toBe(true)
  })

  it('allows interview → offer', () => {
    expect(canTransitionTo('interview', 'offer')).toBe(true)
  })

  it('allows interview → rejected', () => {
    expect(canTransitionTo('interview', 'rejected')).toBe(true)
  })

  it('blocks interview → hired (must go through offer)', () => {
    expect(canTransitionTo('interview', 'hired')).toBe(false)
  })

  it('allows test-task → offer', () => {
    expect(canTransitionTo('test-task', 'offer')).toBe(true)
  })

  it('allows test-task → rejected', () => {
    expect(canTransitionTo('test-task', 'rejected')).toBe(true)
  })

  it('allows offer → hired', () => {
    expect(canTransitionTo('offer', 'hired')).toBe(true)
  })

  it('allows offer → rejected', () => {
    expect(canTransitionTo('offer', 'rejected')).toBe(true)
  })

  it('blocks hired → anything', () => {
    expect(canTransitionTo('hired', 'rejected')).toBe(false)
    expect(canTransitionTo('hired', 'offer')).toBe(false)
  })

  it('blocks rejected → anything', () => {
    expect(canTransitionTo('rejected', 'applied')).toBe(false)
    expect(canTransitionTo('rejected', 'viewed')).toBe(false)
  })

  it('returns false for unknown status', () => {
    expect(canTransitionTo('unknown', 'viewed')).toBe(false)
  })
})
