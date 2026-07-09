'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center font-sans">
        <p className="text-6xl font-bold text-gray-400">500</p>
        <h1 className="text-2xl font-semibold">Критическая ошибка</h1>
        <p className="text-gray-500">Приложение столкнулось с критической ошибкой.</p>
        <button
          onClick={reset}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Перезагрузить
        </button>
      </body>
    </html>
  )
}
