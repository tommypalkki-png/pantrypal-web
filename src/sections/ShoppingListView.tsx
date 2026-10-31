import { useState } from 'react'
import type { InventoryItem, Location } from '@/types/inventory'
import { CATEGORIES, formatQuantity, isLowStock, itemStore, locationColor } from '@/types/inventory'
import type { ShoppingExtra } from '@/hooks/useShoppingExtras'
import { Check, ChefHat, ShoppingCart, Store, X } from 'lucide-react'

interface Props {
  items: InventoryItem[]
  locations: Location[]
  /** manual entries (e.g. missing recipe ingredients) */
  extras: ShoppingExtra[]
  onRemoveExtra: (id: string) => void
  onSelectItem: (item: InventoryItem) => void
}

/** Group label for items with no store set. */
const NO_STORE = 'No store listed'

export function ShoppingListView({ items, locations, extras, onRemoveExtra, onSelectItem }: Props) {
  // checked-off ids (session only — for ticking things off while walking the aisles)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const byId = new Map(locations.map(l => [l.id, l]))
  const lowItems = items.filter(isLowStock)

  // Group by store: named stores A→Z first, "No store listed" last.
  const groups = new Map<string, InventoryItem[]>()
  for (const item of lowItems) {
    const key = itemStore(item) || NO_STORE
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }
  const storeNames = [...groups.keys()].sort((a, b) => {
    if (a === NO_STORE) return 1
    if (b === NO_STORE) return -1
    return a.localeCompare(b)
  })
  for (const list of groups.values()) list.sort((a, b) => a.name.localeCompare(b.name))

  const toggle = (id: string) =>
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const remaining = lowItems.filter(i => !checked.has(i.id)).length
  const remainingExtras = extras.filter(e => !checked.has(e.id)).length
  const totalRemaining = remaining + remainingExtras
  const isEmpty = lowItems.length === 0 && extras.length === 0

  return (
    <div className="grid gap-4 px-4 pb-28 pt-5">
      {isEmpty ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200/60">
          <p className="text-4xl">🛒</p>
          <p className="mt-3 font-medium text-stone-700">Nothing to buy</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-400">
            Items appear here automatically when they run low. Turn on
            “Add to shopping list when low” on any item to use it.
          </p>
        </div>
      ) : (
        <>
          <p className="px-1 text-sm text-stone-500">
            {totalRemaining === 0
              ? 'All ticked — happy shopping! 🎉'
              : `${totalRemaining} item${totalRemaining === 1 ? '' : 's'} to buy · grouped by store`}
          </p>

          {/* Manual entries (from recipes) — shown first, not tied to a store */}
          {extras.length > 0 && (
            <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/60">
              <header className="flex items-center gap-2 px-2 pb-2 pt-1">
                <ChefHat className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-stone-700">From recipes</h2>
                <span className="ml-auto text-xs text-stone-400">
                  {remainingExtras === 0 ? 'done ✓' : `${remainingExtras} to buy`}
                </span>
              </header>
              <div className="divide-y divide-stone-100">
                {extras.map(extra => {
                  const done = checked.has(extra.id)
                  return (
                    <div key={extra.id} className="flex items-center gap-3 px-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggle(extra.id)}
                        aria-label={done ? 'Uncheck' : 'Check off'}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-stone-300 text-transparent hover:border-stone-400'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[15px] font-medium ${
                            done ? 'text-stone-400 line-through' : 'text-stone-800'
                          }`}
                        >
                          {extra.name}
                        </span>
                        {extra.fromRecipe && (
                          <span className="block truncate text-xs text-stone-400">
                            for {extra.fromRecipe}
                          </span>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => onRemoveExtra(extra.id)}
                        aria-label={`Remove ${extra.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-500 active:scale-95"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {storeNames.map(storeName => {
            const list = groups.get(storeName)!
            const isFallback = storeName === NO_STORE
            const leftToBuy = list.filter(i => !checked.has(i.id)).length
            return (
              <section
                key={storeName}
                className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/60"
              >
                <header className="flex items-center gap-2 px-2 pb-2 pt-1">
                  <Store className={`h-4 w-4 ${isFallback ? 'text-stone-300' : 'text-amber-600'}`} />
                  <h2 className={`text-sm font-semibold ${isFallback ? 'text-stone-400' : 'text-stone-700'}`}>
                    {storeName}
                  </h2>
                  <span className="ml-auto text-xs text-stone-400">
                    {leftToBuy === 0 ? 'done ✓' : `${leftToBuy} to buy`}
                  </span>
                </header>
                <div className="divide-y divide-stone-100">
                  {list.map(item => {
                    const loc = byId.get(item.location)
                    const c = locationColor(loc)
                    const done = checked.has(item.id)
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-2 py-2.5">
                        {/* Tick-off checkbox */}
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          aria-label={done ? 'Uncheck' : 'Check off'}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            done
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-stone-300 text-transparent hover:border-stone-400'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>

                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${c.tile}`}
                        >
                          {loc?.emoji ?? CATEGORIES[item.category].emoji}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-[15px] font-medium ${
                              done ? 'text-stone-400 line-through' : 'text-stone-800'
                            }`}
                          >
                            {item.name}
                          </span>
                          <span className="block truncate text-xs text-stone-400">
                            {loc ? `${loc.name} · ` : ''}
                            {formatQuantity(item)} left
                            {item.restockAt != null && ` · restocks at ${item.restockAt}`}
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() => onSelectItem(item)}
                          className="shrink-0 rounded-full bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
                        >
                          Restock
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          <p className="px-1 text-center text-xs text-stone-400">
            Tap Restock after buying to update the quantity — the item leaves
            this list once it's above its low-stock level.
          </p>
        </>
      )}

      {items.length > 0 && lowItems.length === 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60">
          <ShoppingCart className="h-5 w-5 shrink-0 text-stone-300" />
          <p className="text-sm text-stone-500">
            Tip: edit an item and switch on “Add to shopping list when low”.
          </p>
        </div>
      )}
    </div>
  )
}
