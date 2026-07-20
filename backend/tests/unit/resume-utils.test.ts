import {
  canPublishResume,
  canEditResume,
  canArchiveResume,
} from '../../src/api/resume/services/resume-utils'

describe('canPublishResume', () => {
  it('allows publish from draft', () => {
    expect(canPublishResume('draft')).toBe(true)
  })

  it('allows publish from rejected', () => {
    expect(canPublishResume('rejected')).toBe(true)
  })

  it('blocks publish from moderation', () => {
    expect(canPublishResume('moderation')).toBe(false)
  })

  it('blocks publish from published', () => {
    expect(canPublishResume('published')).toBe(false)
  })

  it('blocks publish from archived', () => {
    expect(canPublishResume('archived')).toBe(false)
  })
})

describe('canEditResume', () => {
  it('allows edit for draft', () => {
    expect(canEditResume('draft')).toBe(true)
  })

  it('allows edit for rejected', () => {
    expect(canEditResume('rejected')).toBe(true)
  })

  it('allows edit for published (triggers re-moderation)', () => {
    expect(canEditResume('published')).toBe(true)
  })

  it('allows edit for moderation (keeps under review while applying edits)', () => {
    expect(canEditResume('moderation')).toBe(true)
  })

  it('blocks edit for archived', () => {
    expect(canEditResume('archived')).toBe(false)
  })
})

describe('canArchiveResume', () => {
  it('allows archive for draft', () => {
    expect(canArchiveResume('draft')).toBe(true)
  })

  it('allows archive for published', () => {
    expect(canArchiveResume('published')).toBe(true)
  })

  it('allows archive for rejected', () => {
    expect(canArchiveResume('rejected')).toBe(true)
  })

  it('blocks archive for moderation', () => {
    expect(canArchiveResume('moderation')).toBe(false)
  })

  it('blocks archive for already archived', () => {
    expect(canArchiveResume('archived')).toBe(false)
  })
})
