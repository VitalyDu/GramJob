interface Props {
  used: number
  limit: number
}

function getColorClass(pct: number): string {
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 50) return 'bg-yellow-400'
  return 'bg-green-500'
}

export function LimitBar({ used, limit }: Props) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
  const colorClass = getColorClass(pct)

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm text-gray-600">
        <span>
          {used} из {limit} вакансий
        </span>
        <span>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
      >
        <div
          data-fill
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
