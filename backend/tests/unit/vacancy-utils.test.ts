import {
  canPublish,
  canBoost,
  canArchive,
  canEdit,
  publishedTransitionsOnEdit,
} from '../../src/api/vacancy/services/vacancy-utils'

describe('canPublish', () => {
  it('allows publish from draft', () => {
    expect(canPublish('draft')).toBe(true)
  })

  it('blocks publish from moderation', () => {
    expect(canPublish('moderation')).toBe(false)
  })

  it('blocks publish from published', () => {
    expect(canPublish('published')).toBe(false)
  })

  it('blocks publish from rejected', () => {
    expect(canPublish('rejected')).toBe(false)
  })

  it('blocks publish from expired', () => {
    expect(canPublish('expired')).toBe(false)
  })

  it('blocks publish from archived', () => {
    expect(canPublish('archived')).toBe(false)
  })
})

describe('canBoost', () => {
  it('allows boost for published vacancy', () => {
    expect(canBoost('published')).toBe(true)
  })

  it('blocks boost for draft', () => {
    expect(canBoost('draft')).toBe(false)
  })

  it('blocks boost for moderation', () => {
    expect(canBoost('moderation')).toBe(false)
  })

  it('blocks boost for rejected', () => {
    expect(canBoost('rejected')).toBe(false)
  })

  it('blocks boost for expired', () => {
    expect(canBoost('expired')).toBe(false)
  })

  it('blocks boost for archived', () => {
    expect(canBoost('archived')).toBe(false)
  })
})

describe('canArchive', () => {
  it('allows archive for published', () => {
    expect(canArchive('published')).toBe(true)
  })

  it('allows archive for expired', () => {
    expect(canArchive('expired')).toBe(true)
  })

  it('allows archive for rejected', () => {
    expect(canArchive('rejected')).toBe(true)
  })

  it('allows archive for draft', () => {
    expect(canArchive('draft')).toBe(true)
  })

  it('blocks archive for already archived', () => {
    expect(canArchive('archived')).toBe(false)
  })

  it('blocks archive for moderation', () => {
    expect(canArchive('moderation')).toBe(false)
  })
})

describe('canEdit', () => {
  it('allows edit for draft', () => {
    expect(canEdit('draft')).toBe(true)
  })

  it('allows edit for rejected', () => {
    expect(canEdit('rejected')).toBe(true)
  })

  it('allows edit for published (triggers re-moderation)', () => {
    expect(canEdit('published')).toBe(true)
  })

  it('blocks edit for moderation', () => {
    expect(canEdit('moderation')).toBe(false)
  })

  it('blocks edit for expired', () => {
    expect(canEdit('expired')).toBe(false)
  })

  it('blocks edit for archived', () => {
    expect(canEdit('archived')).toBe(false)
  })
})

describe('publishedTransitionsOnEdit', () => {
  it('returns true for published status', () => {
    expect(publishedTransitionsOnEdit('published')).toBe(true)
  })

  it('returns false for draft', () => {
    expect(publishedTransitionsOnEdit('draft')).toBe(false)
  })
})
