interface Props {
  isOpen: boolean
  onClose: () => void
}

const PLANS = [
  { name: 'Pro', vacancies: 10, price: '299 Stars' },
  { name: 'Max', vacancies: 50, price: '999 Stars' },
]

export function UpsellModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div data-overlay className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Лимит исчерпан</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="ml-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <p className="mb-6 text-sm text-gray-600">
          Вы использовали все вакансии по текущему плану. Обновите подписку, чтобы продолжить
          публикацию.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3">
          {PLANS.map((plan) => (
            <div key={plan.name} className="rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-base font-bold text-gray-900">{plan.name}</p>
              <p className="mt-1 text-sm text-gray-500">{plan.vacancies} вакансий/мес</p>
              <p className="mt-2 text-sm font-medium text-indigo-600">{plan.price}</p>
            </div>
          ))}
        </div>

        <a
          href="/subscription"
          className="block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
        >
          Улучшить план
        </a>
      </div>
    </div>
  )
}
