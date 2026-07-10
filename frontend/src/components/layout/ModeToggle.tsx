'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation()

  const toggle = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label={t('nav.themeSwitcher')}
      onClick={toggle}
    >
      <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
