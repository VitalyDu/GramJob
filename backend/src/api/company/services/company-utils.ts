const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  // Ukrainian / Belarusian extras
  і: 'i',
  ї: 'yi',
  є: 'ye',
  ґ: 'g',
  ў: 'u',
}

function transliterate(text: string): string {
  let result = ''
  for (const char of text) {
    result += CYRILLIC_MAP[char] ?? char
  }
  return result
}

export function toSlug(name: string): string {
  return transliterate(name.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function canSubmit(status: string): boolean {
  // rejected companies can be fixed and re-submitted for moderation
  return status === 'draft' || status === 'rejected'
}

export function canDelete(activeVacancyCount: number): boolean {
  return activeVacancyCount === 0
}
