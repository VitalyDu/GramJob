'use client'

import { useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { useStores } from '@/stores/StoreProvider'
import type { Notification } from '@/types/api'

const POLL_INTERVAL_MS = 60_000

export const ModerationToastWatcher = observer(function ModerationToastWatcher() {
  const { auth } = useStores()
  const seenRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!auth.isAuthenticated) return

    let cancelled = false

    const poll = async () => {
      try {
        const res = await api.get<{ data: Notification[] }>(
          '/notifications?isRead=false&pageSize=20'
        )
        if (cancelled) return
        for (const n of res.data) {
          if (n.type !== 'moderation_approved' && n.type !== 'moderation_rejected') continue
          if (seenRef.current.has(n.documentId)) continue
          seenRef.current.add(n.documentId)
          if (!initializedRef.current) continue
          if (n.type === 'moderation_approved') {
            toast.success(n.title, { description: n.body })
          } else {
            toast.error(n.title, { description: n.body })
          }
        }
        initializedRef.current = true
      } catch {
        // polling failure is non-critical — silently ignore
      }
    }

    void poll()
    const intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [auth.isAuthenticated])

  return null
})
