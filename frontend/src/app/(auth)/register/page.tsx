import Image from 'next/image'
import Link from 'next/link'
import { EmailRegisterForm } from '@/components/auth/EmailRegisterForm'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen justify-center p-4 pt-12 sm:pt-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Image
            src="/logo-vertical.png"
            alt="GramJob"
            width={120}
            height={120}
            priority
            className="mx-auto"
          />
          <CardTitle className="mt-4 text-2xl">Регистрация</CardTitle>
          <CardDescription>Создайте аккаунт, чтобы начать</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EmailRegisterForm />
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="ml-1 underline hover:no-underline">
            Войти
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
