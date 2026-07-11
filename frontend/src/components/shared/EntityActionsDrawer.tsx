'use client'

import React from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DrawerAction {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  statusBadge?: React.ReactNode
  actions: DrawerAction[]
}

export function EntityActionsDrawer({ open, onOpenChange, title, statusBadge, actions }: Props) {
  const isDesktop = useIsDesktop()
  const direction = isDesktop ? 'right' : 'bottom'

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={direction}>
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-start justify-between gap-2 border-b pb-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <DrawerTitle className="line-clamp-2 text-left text-sm">{title}</DrawerTitle>
            {statusBadge && <div className="flex">{statusBadge}</div>}
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {actions.map((action) => {
            const Icon = action.icon
            const inner = (
              <div
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  !action.disabled && 'hover:bg-muted/60',
                  action.variant === 'destructive' && !action.disabled && 'hover:bg-destructive/5',
                  action.disabled && 'pointer-events-none opacity-40'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted',
                    action.variant === 'destructive' && 'bg-destructive/10'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 text-muted-foreground',
                      action.variant === 'destructive' && 'text-destructive'
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      action.variant === 'destructive' && 'text-destructive'
                    )}
                  >
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  )}
                </div>
              </div>
            )

            if (action.href) {
              return (
                <Link key={action.id} href={action.href} onClick={() => onOpenChange(false)}>
                  {inner}
                </Link>
              )
            }

            return (
              <button
                key={action.id}
                className="w-full"
                disabled={action.disabled}
                onClick={() => {
                  onOpenChange(false)
                  action.onClick?.()
                }}
              >
                {inner}
              </button>
            )
          })}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
