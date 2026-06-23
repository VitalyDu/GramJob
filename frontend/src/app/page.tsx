import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4">GramJob</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Международная биржа вакансий в экосистеме Telegram
      </p>
      <div className="flex gap-3">
        <Link
          href="/vacancies"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Смотреть вакансии
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          Войти
        </Link>
      </div>
    </div>
  )
}
