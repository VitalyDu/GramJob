import { Suspense } from 'react'
import { ResetPasswordCard } from './ResetPasswordCard'

export default function ResetPasswordPage() {
  return (
    <div className="flex justify-center p-4 pt-12 sm:pt-16">
      <Suspense>
        <ResetPasswordCard />
      </Suspense>
    </div>
  )
}
