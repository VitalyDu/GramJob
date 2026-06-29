const VALID_REPORT_TYPES = ['vacancy', 'resume', 'company', 'user'] as const
const VALID_REPORT_REASONS = ['spam', 'fraud', 'inappropriate', 'other'] as const

export type ReportType = (typeof VALID_REPORT_TYPES)[number]
export type ReportReason = (typeof VALID_REPORT_REASONS)[number]

export function isValidReportType(type: string): type is ReportType {
  return (VALID_REPORT_TYPES as readonly string[]).includes(type)
}

export function isValidReportReason(reason: string): reason is ReportReason {
  return (VALID_REPORT_REASONS as readonly string[]).includes(reason)
}
