import type { InventoryItem, StorageLocation } from '@/types/inventory'
import { LOCATIONS, daysUntilExpiry, expiryStatus } from '@/types/inventory'
import { ItemRow } from '@/components/ItemRow'
import { Package, Refrigerator, Snowflake, AlertTriangle, CheckCircle2 } from 'lucide-react'

const LOCATION_ICONS: Record<StorageLocation, typeof Package> = {
  pantry: Package,
  fridge: Refrigerator,
  freezer: Snowflake,
}

interface Props {
  items: InventoryItem[]
  onSelectLocation: (location: StorageLocation) => void
  onSelectItem: (item: InventoryItem) => void
}

export function Dashboard({ items, onSelectLocation, onSelectItem }: Props) {
  const attention = items
    .filter(i => ['expired', 'urgent'].includes(expiryStatus(i)))
    .sort((a, b) => (daysUntilExpiry(a) ?? 9999) - (daysUntilExpiry(b) ?? 9999))
  const soon = items
    .filter(i => expiryStatus(i) === 'soon')
    .sort((a, b) => (daysUntilExpiry(a) ?? 9999) - (daysUntilExpiry(b) ?? 9999))

  return (
    <div className="grid gap-6 px-4 pb-28 pt-5">
      {/* Location cards */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(LOCATIONS) as StorageLocation[]).map(loc => {
          const Icon = LOCATION_ICONS[loc]
          const count = items.filter(i => i.location === loc).length
          return (
            <button
              key={loc}
              type="button"
              onClick={() => onSelectLocation(loc)}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60 transition-transform active:scale-95"
            >
              <Icon className={`h-6 w-6 ${LOCATIONS[loc].accent}`} />
              <span className="text-2xl font-bold text-stone-800">{count}</span>
              <span className="text-xs text-stone-400">{LOCATIONS[loc].title}</span>
            </button>
          )
        })}
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200/60">
          <p className="text-4xl">🥫</p>
          <p className="mt-3 font-medium text-stone-700">No items yet</p>
          <p className="mt-1 text-sm text-stone-400">
            Switch to a location tab and tap + to stock your kitchen.
          </p>
        </div>
      )}

      {items.length > 0 && attention.length === 0 && soon.length === 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm text-stone-500">
            Nothing needs attention — your kitchen is under control.
          </p>
        </div>
      )}

      {attention.length > 0 && (
        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/60">
          <h2 className="flex items-center gap-2 px-2 pb-1 pt-1 text-sm font-semibold text-stone-700">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> Needs attention
          </h2>
          <div className="divide-y divide-stone-100">
            {attention.map(item => (
              <ItemRow key={item.id} item={item} showLocation onClick={onSelectItem} />
            ))}
          </div>
        </section>
      )}

      {soon.length > 0 && (
        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/60">
          <h2 className="px-2 pb-1 pt-1 text-sm font-semibold text-stone-700">
            Expiring this week
          </h2>
          <div className="divide-y divide-stone-100">
            {soon.map(item => (
              <ItemRow key={item.id} item={item} showLocation onClick={onSelectItem} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
