import Link from 'next/link'
import { TelegramLoginWidget } from '@/components/auth/TelegramLoginWidget'

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-8 text-center text-2xl font-bold">Войти в GramJob</h1>

      <div className="mb-6 flex justify-center">
        <TelegramLoginWidget redirectTo="/" />
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-muted-foreground">или</span>
        </div>
      </div>

      {/* EmailLoginForm будет добавлена в Task 13 */}
      <div className="text-center text-sm text-muted-foreground">
        Форма входа по email появится скоро
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  )
}
