import Image from 'next/image'
import Link from 'next/link'
import { TelegramLoginWidget } from '@/components/auth/TelegramLoginWidget'
import { EmailLoginForm } from '@/components/auth/EmailLoginForm'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Image src="/logo-vertical.png" alt="GramJob" width={80} height={80} priority />
          <CardTitle className="mt-4 text-2xl">Вход</CardTitle>
          <CardDescription>Войдите через Telegram или email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <TelegramLoginWidget redirectTo="/" />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">или</span>
            </div>
          </div>

          <EmailLoginForm />
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Нет аккаунта?{' '}
          <Link href="/register" className="ml-1 underline hover:no-underline">
            Зарегистрироваться
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
