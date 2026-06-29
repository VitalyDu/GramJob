const VALID_TARGET_TYPES = ['employer', 'candidate'] as const
export type BlockTargetType = (typeof VALID_TARGET_TYPES)[number]

export function isValidTargetType(type: string): type is BlockTargetType {
  return (VALID_TARGET_TYPES as readonly string[]).includes(type)
}
