'use client'

import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import i18next from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
] as const

const THEMES = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const

export function InterfaceSettings() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()

  const setLang = (lang: string) => {
    void i18next.changeLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gramjob_lang', lang)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.interface.languageTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  i18n.language === code
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.interface.themeTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {THEMES.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-medium transition-colors',
                  theme === value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(`settings.interface.theme.${value}`)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
