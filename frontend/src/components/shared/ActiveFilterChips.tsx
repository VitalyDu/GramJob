import { X } from 'lucide-react'

interface Chip {
  key: string
  label: string
  onRemove: () => void
}

interface Props {
  chips: Chip[]
}

export function ActiveFilterChips({ chips }: Props) {
  if (chips.length === 0) return null
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          {chip.label}
          <X className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      ))}
    </div>
  )
}
