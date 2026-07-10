'use client'

import { type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { usePathname } from 'next/navigation'
import { useTelegramInit } from '@/hooks/useTelegramInit'
import { WebHeader } from './WebHeader'
import { TelegramTopBar } from './TelegramTopBar'
import { BottomNav } from './BottomNav'
import { ModerationToastWatcher } from '@/components/moderation/ModerationToastWatcher'
import { StartParamRouter } from './StartParamRouter'

export function AppShell({ children }: { children: ReactNode }) {
  const { isMiniApp } = useTelegramInit()
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col">
      {!isMiniApp && <WebHeader />}
      {isMiniApp && <TelegramTopBar />}
      <main className={`flex-1 ${isMiniApp ? 'pb-20' : 'pb-20 md:pb-0'}`}>
        <div
          className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${isMiniApp && !isHome ? 'py-12' : 'py-6'}`}
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
