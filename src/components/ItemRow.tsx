import type { InventoryItem } from '@/types/inventory'
import { CATEGORIES, LOCATIONS, expiryBadge, formatQuantity } from '@/types/inventory'

interface Props {
  item: InventoryItem
  onClick?: (item: InventoryItem) => void
  showLocation?: boolean
}

export function ItemRow({ item, onClick, showLocation = false }: Props) {
  const badge = expiryBadge(item)
  const loc = LOCATIONS[item.location]

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-stone-100 active:bg-stone-200"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${loc.tileBg}`}
      >
        {CATEGORIES[item.category].emoji}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-stone-800">{item.name}</span>
        <span className="block truncate text-xs text-stone-400">
          {showLocation ? `${loc.title} · ` : ''}
          {item.notes || CATEGORIES[item.category].title}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm tabular-nums text-stone-500">{formatQuantity(item)}</span>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </span>
    </button>
  )
}
