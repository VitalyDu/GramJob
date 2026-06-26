import { checkIsResumeOwner } from '../../src/api/resume/policies/is-resume-owner'

describe('checkIsResumeOwner', () => {
  it('returns true when user owns the resume', () => {
    const resume = { user: { id: 42 } }
    expect(checkIsResumeOwner(resume, 42)).toBe(true)
  })

  it('returns false when user does not own the resume', () => {
    const resume = { user: { id: 42 } }
    expect(checkIsResumeOwner(resume, 99)).toBe(false)
  })

  it('returns false when resume.user is null', () => {
    const resume = { user: null }
    expect(checkIsResumeOwner(resume, 42)).toBe(false)
  })

  it('returns false when resume.user is undefined', () => {
    const resume = { user: undefined }
    expect(checkIsResumeOwner(resume, 42)).toBe(false)
  })
})
