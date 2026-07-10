'use client'

import { type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { useTelegramInit } from '@/hooks/useTelegramInit'
import { WebHeader } from './WebHeader'
import { TelegramTopBar } from './TelegramTopBar'
import { BottomNav } from './BottomNav'
import { ModerationToastWatcher } from '@/components/moderation/ModerationToastWatcher'
import { StartParamRouter } from './StartParamRouter'

export function AppShell({ children }: { children: ReactNode }) {
  const { isMiniApp } = useTelegramInit()

  return (
    <div className="flex min-h-dvh flex-col">
      {!isMiniApp && <WebHeader />}
      {isMiniApp && <TelegramTopBar />}
      <main className={`flex-1 ${isMiniApp ? 'pb-20' : 'pb-20 md:pb-0'}`}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
      <BottomNav isMiniApp={isMiniApp} />
      <StartParamRouter />
      <ModerationToastWatcher />
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}
