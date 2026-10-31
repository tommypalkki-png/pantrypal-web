import { useEffect, useState } from 'react'
import type { InventoryItem } from '@/types/inventory'
import {
  recommendRecipes, scoreCustomRecipes,
  type CustomRecipeInput, type ScoredRecipe,
} from '@/lib/recipes'
import { ArrowRight, ChefHat } from 'lucide-react'

interface Props {
  items: InventoryItem[]
  customRecipes: CustomRecipeInput[]
  /** navigate to the Dinner tab */
  onOpenRecipes: () => void
}

const CACHE_KEY = 'pantrypal-banner-recipe-v1'

interface CacheEntry {
  /** fingerprint of the items the pick was computed from */
  itemsKey: string
  recipe: ScoredRecipe
}

function loadCache(itemsKey: string): ScoredRecipe | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    return entry.itemsKey === itemsKey ? entry.recipe : null
  } catch {
    return null
  }
}

/**
 * "Tonight's pick" banner for the Home screen — one best-match recipe
 * (custom recipes included). Cached per session so it doesn't refetch
 * on every visit; silently hidden when there's nothing to suggest.
 */
export function RecipeBanner({ items, customRecipes, onOpenRecipes }: Props) {
  const itemsKey = JSON.stringify(items.map(i => i.id + i.name).sort())
  const customsKey = JSON.stringify(customRecipes.map(c => c.id + c.name).sort())
  const [pick, setPick] = useState<ScoredRecipe | null>(() => loadCache(itemsKey))

  useEffect(() => {
    if (items.length === 0) {
      setPick(null)
      return
    }

    // Custom recipes score offline — compute immediately.
    const customs = scoreCustomRecipes(items, customRecipes)
    const bestCustom = customs
      .filter(r => r.matched.length >= 2)
      .sort((a, b) => b.score - a.score)[0] ?? null

    const cached = loadCache(itemsKey)
    if (cached) {
      // Prefer a custom recipe when it matches at least as well.
      setPick(bestCustom && bestCustom.score >= cached.score ? bestCustom : cached)
      return
    }

    let cancelled = false
    recommendRecipes(items, { maxResults: 1, candidateLimit: 8 })
      .then(recipes => {
        if (cancelled) return
        const bestOnline = recipes[0] ?? null
        const winner =
          bestCustom && (!bestOnline || bestCustom.score >= bestOnline.score)
            ? bestCustom
            : bestOnline
        setPick(winner)
        if (winner) {
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ itemsKey, recipe: winner } satisfies CacheEntry))
          } catch { /* storage full — fine */ }
        }
      })
      .catch(() => {
        // Offline or API down — fall back to the best custom recipe, if any.
        if (!cancelled) setPick(bestCustom)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, customsKey])

  if (!pick || items.length === 0) return null

  const pct = Math.round(pick.score * 100)

  return (
    <button
      type="button"
      onClick={onOpenRecipes}
      className="flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-3 text-left text-white shadow-md transition-transform active:scale-[0.98]"
    >
      {pick.thumb ? (
        <img
          src={pick.thumb}
          alt={pick.name}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-white/40"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <ChefHat className="h-7 w-7" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/80">
          Tonight's pick · {pct}% match{pick.isCustom ? ' · ⭐ my recipe' : ''}
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-bold leading-snug">
          {pick.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-white/80">
          Uses {pick.matched.slice(0, 3).join(', ')}
          {pick.matched.length > 3 && ` +${pick.matched.length - 3}`}
          {pick.missing.length > 0 ? ` · ${pick.missing.length} missing` : ' · you have everything!'}
        </span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-white/80" />
    </button>
  )
}
