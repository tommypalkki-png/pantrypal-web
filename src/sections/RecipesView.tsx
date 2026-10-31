import { useEffect, useState } from 'react'
import type { InventoryItem } from '@/types/inventory'
import {
  recommendRecipes, scoreCustomRecipes,
  type CustomRecipeInput, type ScoredRecipe,
} from '@/lib/recipes'
import { RecipeFormDialog } from '@/components/RecipeFormDialog'
import {
  Check, ChefHat, ExternalLink, Loader2, Plus, RefreshCw, Trash2, Youtube,
} from 'lucide-react'

interface Props {
  items: InventoryItem[]
  customRecipes: CustomRecipeInput[]
  onAddCustomRecipe: (recipe: Omit<CustomRecipeInput, 'id'>) => void
  onDeleteCustomRecipe: (customId: string) => void
  /** add names to the shopping list; returns how many were new */
  onAddToShoppingList: (names: string[], fromRecipe?: string) => number
}

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; recipes: ScoredRecipe[] }

export function RecipesView({
  items, customRecipes, onAddCustomRecipe, onDeleteCustomRecipe, onAddToShoppingList,
}: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  /** recipe ids whose missing ingredients were sent to the shopping list */
  const [addedIds, setAddedIds] = useState<Map<string, number>>(new Map())

  // Custom recipes are scored locally — always available, even offline.
  const customs = scoreCustomRecipes(items, customRecipes)

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    recommendRecipes(items)
      .then(recipes => {
        if (!cancelled) setState({ kind: 'ready', recipes })
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' })
      })
    // Safety net: never spin forever on a stalled network.
    const timeout = setTimeout(() => {
      if (!cancelled) setState(s => (s.kind === 'loading' ? { kind: 'error' } : s))
    }, 25_000)
    return () => { cancelled = true; clearTimeout(timeout) }
    // re-run only when the underlying item list content changes materially
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map(i => i.id + i.name).sort()), round])

  const addMissing = (recipe: ScoredRecipe) => {
    const n = onAddToShoppingList(recipe.missing, recipe.name)
    setAddedIds(prev => new Map(prev).set(recipe.id, n))
  }

  const renderCard = (recipe: ScoredRecipe) => {
    const pct = Math.round(recipe.score * 100)
    const expanded = expandedId === recipe.id
    const addedCount = addedIds.get(recipe.id)
    return (
      <section
        key={recipe.id}
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/60"
      >
        <button
          type="button"
          onClick={() => setExpandedId(expanded ? null : recipe.id)}
          className="block w-full text-left"
        >
          {recipe.thumb && (
            <img
              src={recipe.thumb}
              alt={recipe.name}
              loading="lazy"
              className="h-36 w-full object-cover"
            />
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[15px] font-semibold leading-snug text-stone-800">
                {recipe.isCustom && <span className="mr-1">⭐</span>}
                {recipe.name}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  pct >= 70
                    ? 'bg-emerald-100 text-emerald-700'
                    : pct >= 40
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-stone-100 text-stone-500'
                }`}
              >
                {pct}% match
              </span>
            </div>
            {(recipe.category || recipe.area) && (
              <p className="mt-1 text-xs text-stone-400">
                {[recipe.area, recipe.category].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              <span className="font-medium text-emerald-700">
                Uses {recipe.matched.length} you have:
              </span>{' '}
              {recipe.matched.slice(0, 5).join(', ')}
              {recipe.matched.length > 5 && ` +${recipe.matched.length - 5} more`}
            </p>
            {recipe.missing.length > 0 && (
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                <span className="font-medium text-amber-700">
                  Missing {recipe.missing.length}:
                </span>{' '}
                {recipe.missing.slice(0, 5).join(', ')}
                {recipe.missing.length > 5 && ` +${recipe.missing.length - 5} more`}
              </p>
            )}
            <p className="mt-2 text-xs font-medium text-stone-400">
              {expanded ? 'Tap to hide ▲' : 'Tap for recipe ▼'}
            </p>
          </div>
        </button>

        {expanded && (
          <div className="border-t border-stone-100 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Ingredients
            </h3>
            <ul className="mt-1.5 grid gap-0.5 text-sm text-stone-600">
              {recipe.ingredientLines.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>

            {recipe.missing.length > 0 && (
              <button
                type="button"
                onClick={() => addMissing(recipe)}
                disabled={addedCount !== undefined}
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white active:scale-95 ${
                  addedCount !== undefined ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              >
                {addedCount !== undefined ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {addedCount > 0
                      ? `Added ${addedCount} to shopping list`
                      : 'Already on shopping list'}
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Add {recipe.missing.length} missing to shopping list
                  </>
                )}
              </button>
            )}

            {recipe.instructions && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Method
                </h3>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-stone-600">
                  {recipe.instructions}
                </p>
              </>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-800 px-3.5 py-2 text-xs font-semibold text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Full recipe
                </a>
              )}
              {recipe.youtubeUrl && (
                <a
                  href={recipe.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-2 text-xs font-semibold text-white"
                >
                  <Youtube className="h-3.5 w-3.5" /> Video
                </a>
              )}
              {recipe.isCustom && recipe.customId && (
                <button
                  type="button"
                  onClick={() => onDeleteCustomRecipe(recipe.customId!)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-red-600 ring-1 ring-red-200 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete my recipe
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    )
  }

  const online = state.kind === 'ready' ? state.recipes : []

  return (
    <div className="grid gap-4 px-4 pb-28 pt-5">
      {/* My recipes header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-medium text-stone-600">
          {customs.length > 0
            ? `${customs.length} of my recipe${customs.length === 1 ? '' : 's'}`
            : 'Your own recipes'}
        </p>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-800 px-3.5 py-2 text-xs font-semibold text-white active:scale-95"
        >
          <Plus className="h-4 w-4" /> Add recipe
        </button>
      </div>

      {/* Custom recipes first — they're the user's own */}
      {customs.map(renderCard)}

      {/* Online suggestions */}
      {state.kind === 'loading' && (
        <div className="mt-6 flex flex-col items-center gap-3 text-stone-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Finding dinners you can make…</p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-200/60">
          <p className="text-3xl">😕</p>
          <p className="mt-2 font-medium text-stone-700">Couldn't reach the recipe service</p>
          <p className="mt-1 text-sm text-stone-400">
            Your own recipes above still work offline.
          </p>
          <button
            type="button"
            onClick={() => setRound(r => r + 1)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-stone-800 px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {state.kind === 'ready' && online.length === 0 && customs.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200/60">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 font-medium text-stone-700">No matching dinners found</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-400">
            Add more ingredients to your pantry, or add your own recipe above.
          </p>
        </div>
      )}

      {state.kind === 'ready' && online.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1 pt-2">
            <p className="text-sm text-stone-500">
              {online.length} suggestion{online.length === 1 ? '' : 's'} from your ingredients
            </p>
            <button
              type="button"
              onClick={() => setRound(r => r + 1)}
              aria-label="Refresh suggestions"
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-200"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {online.map(renderCard)}
        </>
      )}

      <p className="flex items-center justify-center gap-1.5 px-1 text-center text-xs text-stone-400">
        <ChefHat className="h-3.5 w-3.5" />
        ⭐ = your recipes · online suggestions by TheMealDB
      </p>

      <RecipeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={onAddCustomRecipe}
      />
    </div>
  )
}
