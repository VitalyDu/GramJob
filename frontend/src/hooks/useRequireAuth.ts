'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStores } from '@/stores/StoreProvider'

export function useRequireAuth() {
  const router = useRouter()
  const { auth } = useStores()

  useEffect(() => {
    if (auth.isInitializing) return
    if (!auth.isAuthenticated) router.replace('/login')
  }, [auth.isAuthenticated, auth.isInitializing, router])

  return auth.isAuthenticated
}
