'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { rootStore } from './RootStore'
import type { RootStore } from './RootStore'

const StoreContext = createContext<RootStore>(rootStore)

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    rootStore.auth.init()
  }, [])

  return <StoreContext.Provider value={rootStore}>{children}</StoreContext.Provider>
}

export function useStores(): RootStore {
  return useContext(StoreContext)
}
