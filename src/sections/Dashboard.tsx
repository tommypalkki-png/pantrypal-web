import type { InventoryItem, Location } from '@/types/inventory'
import { daysUntilExpiry, expiryStatus, locationColor } from '@/types/inventory'
import type { CustomRecipeInput } from '@/lib/recipes'
import { ItemRow } from '@/components/ItemRow'
import { RecipeBanner } from '@/components/RecipeBanner'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  items: InventoryItem[]
  locations: Location[]
  customRecipes: CustomRecipeInput[]
  onOpenRecipes: () => void
  onSelectLocation: (locationId: string) => void
  onSelectItem: (item: InventoryItem) => void
}

export function Dashboard({ items, locations, customRecipes, onOpenRecipes, onSelectLocation, onSelectItem }: Props) {
  const byId = new Map(locations.map(l => [l.id, l]))

  const attention = items
    .filter(i => ['expired', 'urgent'].includes(expiryStatus(i)))
    .sort((a, b) => (daysUntilExpiry(a) ?? 9999) - (daysUntilExpiry(b) ?? 9999))
  const soon = items
    .filter(i => expiryStatus(i) === 'soon')
    .sort((a, b) => (daysUntilExpiry(a) ?? 9999) - (daysUntilExpiry(b) ?? 9999))

  return (
    <div className="grid grid-cols-1 gap-6 px-4 pb-28 pt-5">
      {/* Tonight's pick */}
      <RecipeBanner items={items} customRecipes={customRecipes} onOpenRecipes={onOpenRecipes} />

      {/* Location cards */}
      <div className="grid grid-cols-3 gap-3">
        {locations.map(loc => {
          const c = locationColor(loc)
          const count = items.filter(i => i.location === loc.id).length
          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => onSelectLocation(loc.id)}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60 transition-transform active:scale-95"
            >
              <span className="text-2xl">{loc.emoji}</span>
              <span className="text-2xl font-bold text-stone-800">{count}</span>
              <span className={`w-full truncate text-xs ${c.text}`}>{loc.name}</span>
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
              <ItemRow key={item.id} item={item} location={byId.get(item.location)} showLocation onClick={onSelectItem} />
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
              <ItemRow key={item.id} item={item} location={byId.get(item.location)} showLocation onClick={onSelectItem} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
