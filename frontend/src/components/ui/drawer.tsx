'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const DrawerContext = React.createContext<{ onClose: () => void }>({ onClose: () => {} })

function Drawer({ onOpenChange, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const onClose = React.useCallback(() => onOpenChange?.(false), [onOpenChange])
  return (
    <DrawerContext.Provider value={{ onClose }}>
      <DialogPrimitive.Root
        data-slot="drawer"
        {...(onOpenChange ? { onOpenChange } : {})}
        {...props}
      />
    </DrawerContext.Provider>
  )
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/40',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const { onClose } = React.useContext(DrawerContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef({ active: false, startY: 0 })

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { active: false, startY: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = contentRef.current
    if (!el) return
    const dy = Math.max(0, e.clientY - drag.current.startY)
    if (dy > 4) drag.current.active = true
    if (!drag.current.active) return
    el.style.transform = `translateY(${dy}px)`
    el.style.transition = 'none'
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const el = contentRef.current
    if (!drag.current.active || !el) return
    drag.current.active = false
    const dy = Math.max(0, e.clientY - drag.current.startY)

    if (dy > 80) {
      el.style.transform = 'translateY(100%)'
      el.style.transition = 'transform 280ms ease'
      setTimeout(() => {
        if (!contentRef.current) return
        // Disable Radix exit animation — element is already off-screen
        contentRef.current.style.animation = 'none'
        onClose()
      }, 260)
    } else {
      el.style.transition = 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)'
      el.style.transform = ''
      setTimeout(() => {
        if (contentRef.current) contentRef.current.style.transition = ''
      }, 250)
    }
  }

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="drawer-content"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] bg-background',
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-full',
          '[animation-duration:300ms]',
          className
        )}
        {...props}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="flex items-center justify-center pt-3 pb-1 touch-none cursor-grab active:cursor-grabbing"
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/20" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn('flex flex-col gap-1.5 px-4 pb-2 pt-2', className)}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-base font-semibold leading-none', className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
