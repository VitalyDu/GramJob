'use client'

import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18next from '@/lib/i18n'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LanguageDrawer({ open, onOpenChange }: Props) {
  const { i18n } = useTranslation()
  const currentLang = i18n.language

  const setLang = (lang: string) => {
    void i18next.changeLanguage(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gramjob_lang', lang)
    }
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Язык / Language</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-0.5 px-4 pb-6 pt-1">
          <button
            type="button"
            onClick={() => setLang('ru')}
            className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent"
          >
            Русский
            {currentLang === 'ru' && <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent"
          >
            English
            {currentLang === 'en' && <Check className="h-4 w-4" />}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
