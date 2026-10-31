import { useMemo, useState } from 'react'
import type { InventoryItem, ItemCategory, Location } from '@/types/inventory'
import { CATEGORIES, daysUntilExpiry, locationColor } from '@/types/inventory'
import { ItemRow } from '@/components/ItemRow'
import { ListPlus, Plus, Search } from 'lucide-react'

interface Props {
  location: Location
  items: InventoryItem[]
  onAdd: () => void
  onBulkAdd: () => void
  onSelectItem: (item: InventoryItem) => void
}

export function LocationView({ location, items, onAdd, onBulkAdd, onSelectItem }: Props) {
  const [query, setQuery] = useState('')
  const c = locationColor(location)

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = items
      .filter(i => i.location === location.id)
      .filter(i =>
        !q ||
        i.name.toLowerCase().includes(q) ||
        CATEGORIES[i.category].title.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const da = daysUntilExpiry(a)
        const db = daysUntilExpiry(b)
        if (da !== null && db !== null) return da - db
        if (da !== null) return -1
        if (db !== null) return 1
        return b.dateAdded - a.dateAdded
      })

    const map = new Map<ItemCategory, InventoryItem[]>()
    for (const item of base) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return [...map.entries()].sort(([a], [b]) =>
      CATEGORIES[a].title.localeCompare(CATEGORIES[b].title),
    )
  }, [items, location.id, query])

  const isEmpty = !items.some(i => i.location === location.id)

  return (
    <div className="px-4 pb-28 pt-4">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${location.name.toLowerCase()}`}
          className="w-full rounded-xl border-0 bg-white py-2.5 pl-9 pr-3 text-[15px] shadow-sm ring-1 ring-stone-200/60 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
      </div>

      {/* Bulk add */}
      <button
        type="button"
        onClick={onBulkAdd}
        className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-medium text-stone-500 shadow-sm ring-1 ring-stone-200/60 transition-transform active:scale-[0.98]"
      >
        <ListPlus className="h-4 w-4" />
        Bulk add — paste a whole list at once
      </button>

      {isEmpty ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-5xl">{location.emoji}</p>
          <p className="font-medium text-stone-700">Empty {location.name.toLowerCase()}</p>
          <p className="text-sm text-stone-400">Tap below to stock your {location.name.toLowerCase()}.</p>
          <button
            type="button"
            onClick={onAdd}
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-95 ${c.solid}`}
          >
            <Plus className="h-4 w-4" /> Add first item
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {grouped.map(([category, list]) => (
            <section key={category} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/60">
              <h2 className="px-2 pb-1 pt-1 text-sm font-semibold text-stone-600">
                {CATEGORIES[category].emoji} {CATEGORIES[category].title}
              </h2>
              <div className="divide-y divide-stone-100">
                {list.map(item => (
                  <ItemRow key={item.id} item={item} location={location} onClick={onSelectItem} />
                ))}
              </div>
            </section>
          ))}
          {grouped.length === 0 && (
            <p className="mt-8 text-center text-sm text-stone-400">No matches for “{query}”.</p>
          )}
        </div>
      )}
    </div>
  )
}
