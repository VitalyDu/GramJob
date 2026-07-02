import {
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  rejectionReasonLabel,
  isModeratableEntity,
  validateRejection,
  computeAvgProcessingHours,
} from '../../src/services/moderation-utils'

describe('REJECTION_REASONS', () => {
  it('содержит 8 причин из moderation-system.md', () => {
    expect(REJECTION_REASONS).toEqual([
      'spam',
      'fake',
      'inappropriate',
      'incomplete',
      'wrong_category',
      'salary_mismatch',
      'contact_info',
      'other',
    ])
  })

  it('у каждой причины есть русская метка', () => {
    for (const r of REJECTION_REASONS) {
      expect(typeof REJECTION_REASON_LABELS[r]).toBe('string')
      expect(REJECTION_REASON_LABELS[r].length).toBeGreaterThan(0)
    }
  })
})

describe('rejectionReasonLabel', () => {
  it('известная причина → метка', () => {
    expect(rejectionReasonLabel('spam')).toBe('Спам или дублирующийся контент')
  })

  it('null/undefined/неизвестная → "см. детали"', () => {
    expect(rejectionReasonLabel(null)).toBe('см. детали')
    expect(rejectionReasonLabel(undefined)).toBe('см. детали')
    expect(rejectionReasonLabel('nope')).toBe('см. детали')
  })
})

describe('isModeratableEntity', () => {
  it('vacancy/resume/company → true', () => {
    expect(isModeratableEntity('vacancy')).toBe(true)
    expect(isModeratableEntity('resume')).toBe(true)
    expect(isModeratableEntity('company')).toBe(true)
  })

  it('report/user/пустая строка → false', () => {
    expect(isModeratableEntity('report')).toBe(false)
    expect(isModeratableEntity('user')).toBe(false)
    expect(isModeratableEntity('')).toBe(false)
  })
})

describe('validateRejection', () => {
  it('валидная причина без комментария → null', () => {
    expect(validateRejection('spam', undefined)).toBeNull()
  })

  it('неизвестная причина → INVALID_REASON', () => {
    expect(validateRejection('bad_reason', undefined)).toBe('INVALID_REASON')
  })

  it('не-строка → INVALID_REASON', () => {
    expect(validateRejection(5, undefined)).toBe('INVALID_REASON')
    expect(validateRejection(undefined, undefined)).toBe('INVALID_REASON')
  })

  it('other без комментария → COMMENT_REQUIRED', () => {
    expect(validateRejection('other', undefined)).toBe('COMMENT_REQUIRED')
    expect(validateRejection('other', '   ')).toBe('COMMENT_REQUIRED')
  })

  it('other с комментарием → null', () => {
    expect(validateRejection('other', 'дубликат вакансии #42')).toBeNull()
  })
})

describe('computeAvgProcessingHours', () => {
  const log = (
    entityType: string,
    entityDocumentId: string,
    action: string,
    createdAt: string
  ) => ({ entityType, entityDocumentId, action, createdAt })

  it('нет пар submitted→решение → null', () => {
    expect(computeAvgProcessingHours([])).toBeNull()
    expect(
      computeAvgProcessingHours([log('vacancy', 'a', 'approved', '2026-07-01T12:00:00Z')])
    ).toBeNull()
  })

  it('среднее по парам: 2ч и 4ч → 3', () => {
    const logs = [
      log('vacancy', 'a', 'submitted', '2026-07-01T10:00:00Z'),
      log('vacancy', 'a', 'approved', '2026-07-01T12:00:00Z'),
      log('resume', 'b', 'submitted', '2026-07-01T10:00:00Z'),
      log('resume', 'b', 'rejected', '2026-07-01T14:00:00Z'),
    ]
    expect(computeAvgProcessingHours(logs)).toBe(3)
  })

  it('порядок входных логов не важен (сортирует сам)', () => {
    const logs = [
      log('vacancy', 'a', 'approved', '2026-07-01T12:00:00Z'),
      log('vacancy', 'a', 'submitted', '2026-07-01T10:00:00Z'),
    ]
    expect(computeAvgProcessingHours(logs)).toBe(2)
  })

  it('повторная подача: пара считается от последнего submitted', () => {
    const logs = [
      log('vacancy', 'a', 'submitted', '2026-07-01T00:00:00Z'),
      log('vacancy', 'a', 'rejected', '2026-07-01T01:00:00Z'),
      log('vacancy', 'a', 'submitted', '2026-07-02T00:00:00Z'),
      log('vacancy', 'a', 'approved', '2026-07-02T02:00:00Z'),
    ]
    // пары: 1ч и 2ч → 1.5
    expect(computeAvgProcessingHours(logs)).toBe(1.5)
  })

  it('решение без submitted игнорируется, округление до 1 знака', () => {
    const logs = [
      log('vacancy', 'x', 'approved', '2026-07-01T05:00:00Z'),
      log('company', 'c', 'submitted', '2026-07-01T00:00:00Z'),
      log('company', 'c', 'approved', '2026-07-01T00:20:00Z'),
    ]
    expect(computeAvgProcessingHours(logs)).toBe(0.3)
  })
})
