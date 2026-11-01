import { useState } from 'react'
import type { InventoryItem, Location } from '@/types/inventory'
import { CATEGORIES, daysUntilExpiry, expiryStatus, locationColor } from '@/types/inventory'
import type { CustomRecipeInput } from '@/lib/recipes'
import { ItemRow } from '@/components/ItemRow'
import { RecipeBanner } from '@/components/RecipeBanner'
import { AlertTriangle, CheckCircle2, ScanBarcode, Search, X } from 'lucide-react'

interface Props {
  items: InventoryItem[]
  locations: Location[]
  customRecipes: CustomRecipeInput[]
  onOpenRecipes: () => void
  onSelectLocation: (locationId: string) => void
  onSelectItem: (item: InventoryItem) => void
  /** open the barcode scanner (result opens the listing or add form) */
  onScan: () => void
}

export function Dashboard({ items, locations, customRecipes, onOpenRecipes, onSelectLocation, onSelectItem, onScan }: Props) {
  const byId = new Map(locations.map(l => [l.id, l]))
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const searchResults = q
    ? items
        .filter(i =>
          i.name.toLowerCase().includes(q) ||
          i.notes.toLowerCase().includes(q) ||
          (i.store ?? '').toLowerCase().includes(q) ||
          (i.barcode ?? '').includes(q) ||
          CATEGORIES[i.category].title.toLowerCase().includes(q),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    : []

  const attention = items
    .filter(i => ['expired', 'urgent'].includes(expiryStatus(i)))
    .sort((a, b) => (daysUntilExpiry(a) ?? 9999) - (daysUntilExpiry(b) ?? 9999))
  const soon = items
    .filter(i => expiryStatus(i) === 'soon')
    .sort((a, b) => (daysUntilExpiry(a) ?? 9999) - (daysUntilExpiry(b) ?? 9999))

  return (
    <div className="grid grid-cols-1 gap-6 px-4 pb-28 pt-5">
      {/* Global search — across all locations */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search everything — name, store, barcode…"
          className="w-full rounded-xl border-0 bg-white py-2.5 pl-9 pr-16 text-[15px] shadow-sm ring-1 ring-stone-200/60 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="flex h-6 w-6 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onScan}
            aria-label="Scan a barcode"
            className="flex h-6 w-6 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 active:scale-90"
          >
            <ScanBarcode className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search results replace the dashboard while typing */}
      {q ? (
        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/60">
          <h2 className="px-2 pb-1 pt-1 text-sm font-semibold text-stone-600">
            {searchResults.length === 0
              ? `No matches for “${query.trim()}”`
              : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
          </h2>
          {searchResults.length > 0 && (
            <div className="divide-y divide-stone-100">
              {searchResults.map(item => (
                <ItemRow key={item.id} item={item} location={byId.get(item.location)} showLocation onClick={onSelectItem} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
