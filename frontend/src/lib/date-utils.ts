/** BCP-47 locale для Date.toLocaleDateString / toLocaleString. */
export function dateLocale(lang: string): string {
  return lang === 'en' ? 'en-GB' : 'ru-RU'
}
