'use client'

import { type ReactNode, useEffect } from 'react'
import { Toaster } from 'sonner'
import { usePathname, useRouter } from 'next/navigation'
import { useTelegramInit } from '@/hooks/useTelegramInit'
import { getTelegramWebApp } from '@/lib/telegram'
import { WebHeader } from './WebHeader'
import { TelegramTopBar } from './TelegramTopBar'
import { BottomNav } from './BottomNav'
import { ModerationToastWatcher } from '@/components/moderation/ModerationToastWatcher'
import { StartParamRouter } from './StartParamRouter'

const ROOT_PATHS = new Set([
  '/',
  '/companies',
  '/vacancies',
  '/dashboard',
  '/dashboard/resumes',
  '/dashboard/applications',
])

export function AppShell({ children }: { children: ReactNode }) {
  const { isMiniApp } = useTelegramInit()
  const pathname = usePathname()
  const router = useRouter()
  const isHome = pathname === '/'

  useEffect(() => {
    if (!isMiniApp) return
    const twa = getTelegramWebApp()
    if (!twa) return
    const isRoot = ROOT_PATHS.has(pathname)
    if (isRoot) {
      twa.BackButton.hide()
      return
    }
    const handler = () => router.back()
    twa.BackButton.onClick(handler)
    twa.BackButton.show()
    return () => {
      twa.BackButton.offClick(handler)
      twa.BackButton.hide()
    }
  }, [isMiniApp, pathname, router])

  return (
    <div className="flex min-h-screen flex-col">
      {!isMiniApp && <WebHeader />}
      {isMiniApp && <TelegramTopBar />}
      <main className={`flex-1 ${isMiniApp ? 'pb-20' : 'pb-20 md:pb-0'}`}>
        <div
          className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${isMiniApp && !isHome ? 'py-16' : 'py-6'}`}
        >
          {children}
        </div>
      </main>
      <BottomNav isMiniApp={isMiniApp} />
      <StartParamRouter />
      <ModerationToastWatcher />
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}
