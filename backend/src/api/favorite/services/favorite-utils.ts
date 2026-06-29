const VALID_FAVORITE_TYPES = ['vacancy', 'resume', 'company'] as const
export type FavoriteType = (typeof VALID_FAVORITE_TYPES)[number]

export function isValidFavoriteType(type: string): type is FavoriteType {
  return (VALID_FAVORITE_TYPES as readonly string[]).includes(type)
}
