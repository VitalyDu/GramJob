import { isValidReportType, isValidReportReason } from '../../src/api/report/services/report-utils'

describe('isValidReportType', () => {
  it('returns true for vacancy', () => {
    expect(isValidReportType('vacancy')).toBe(true)
  })

  it('returns true for resume', () => {
    expect(isValidReportType('resume')).toBe(true)
  })

  it('returns true for company', () => {
    expect(isValidReportType('company')).toBe(true)
  })

  it('returns true for user', () => {
    expect(isValidReportType('user')).toBe(true)
  })

  it('returns false for unknown type', () => {
    expect(isValidReportType('application')).toBe(false)
  })
})

describe('isValidReportReason', () => {
  it('returns true for spam', () => {
    expect(isValidReportReason('spam')).toBe(true)
  })

  it('returns true for fraud', () => {
    expect(isValidReportReason('fraud')).toBe(true)
  })

  it('returns true for inappropriate', () => {
    expect(isValidReportReason('inappropriate')).toBe(true)
  })

  it('returns true for other', () => {
    expect(isValidReportReason('other')).toBe(true)
  })

  it('returns false for unknown reason', () => {
    expect(isValidReportReason('duplicate')).toBe(false)
  })
})
