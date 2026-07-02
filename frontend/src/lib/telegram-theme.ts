import type { TelegramWebApp } from './telegram'

const THEME_VAR_MAP: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['bg_color', ['--background']],
  [
    'text_color',
    [
      '--foreground',
      '--card-foreground',
      '--popover-foreground',
      '--secondary-foreground',
      '--accent-foreground',
    ],
  ],
  ['section_bg_color', ['--card', '--popover']],
  ['secondary_bg_color', ['--secondary', '--muted', '--accent']],
  ['hint_color', ['--muted-foreground']],
  ['button_color', ['--primary', '--ring']],
  ['button_text_color', ['--primary-foreground']],
  ['destructive_text_color', ['--destructive']],
  ['section_separator_color', ['--border', '--input']],
]

export function applyTelegramTheme(twa: TelegramWebApp): void {
  const root = document.documentElement
  for (const [param, cssVars] of THEME_VAR_MAP) {
    const value = twa.themeParams[param]
    if (!value) continue
    for (const cssVar of cssVars) root.style.setProperty(cssVar, value)
  }
  root.classList.toggle('dark', twa.colorScheme === 'dark')
  const bg = twa.themeParams['bg_color']
  if (bg) {
    twa.setHeaderColor(bg)
    twa.setBackgroundColor(bg)
  }
}
