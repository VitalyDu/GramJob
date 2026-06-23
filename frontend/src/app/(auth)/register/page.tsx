import Link from 'next/link'
import { EmailRegisterForm } from '@/components/auth/EmailRegisterForm'

export default function RegisterPage() {
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-8 text-center text-2xl font-bold">Создать аккаунт</h1>
      <EmailRegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </p>
    </div>
  )
}
