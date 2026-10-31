import type { InventoryItem } from '@/types/inventory'
import { daysUntilExpiry } from '@/types/inventory'

// ---- TheMealDB (free, no API key) ----

const API = 'https://www.themealdb.com/api/json/v1/1'

export interface RecipeSummary {
  id: string
  name: string
  thumb: string
}

export interface Recipe {
  id: string
  name: string
  thumb: string
  category: string
  area: string
  instructions: string
  sourceUrl: string | null
  youtubeUrl: string | null
  /** recipe ingredients (names only, lowercased) */
  ingredients: string[]
  /** ingredient + measure, for display */
  ingredientLines: string[]
}

export interface ScoredRecipe extends Recipe {
  /** pantry items that matched recipe ingredients */
  matched: string[]
  /** recipe ingredients the pantry is missing */
  missing: string[]
  /** matched / total recipe ingredients, 0..1 */
  score: number
  /** true for the user's own recipes */
  isCustom?: boolean
  /** id within the custom-recipe store (for delete) */
  customId?: string
}

// ---- Ingredient keyword extraction ----

/** Words that don't help match a recipe ingredient. */
const STOP_WORDS = new Set([
  'whole', 'fresh', 'frozen', 'organic', 'large', 'small', 'medium',
  'free', 'range', 'low', 'fat', 'full', 'cream', 'greek', 'baby',
  'chopped', 'diced', 'sliced', 'canned', 'tinned', 'dried', 'raw',
])

/** Very small singularizer: "tomatoes" -> "tomato", "eggs" -> "egg". */
function singular(word: string): string {
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y'
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2) // tomatoes -> tomatoe? no — handle below
  if (word.endsWith('es') && word.length > 3 && !/(ss|us|is)$/.test(word)) {
    // potatoes -> potatoe is wrong; handle common cases explicitly
    if (/(tato|ego)$/.test(word)) return word.slice(0, -2) // heroes? edge — acceptable
    return word.slice(0, -1)
  }
  if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/** Extract matchable keywords from an item name: both full phrase and individual words. */
export function itemKeywords(name: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  const keys = new Set<string>()
  for (const w of words) {
    keys.add(w)
    keys.add(singular(w))
  }
  // full phrase helps for multi-word ingredients like "olive oil"
  const phrase = words.join(' ').trim()
  if (phrase.length > 2) keys.add(phrase)
  return [...keys]
}

/** One canonical keyword set per pantry item, for matching against recipe ingredients. */
export interface PantryIngredient {
  itemId: string
  itemName: string
  keywords: string[]
  /** days until expiry, null when no date — used to prioritize what to cook first */
  expiresIn: number | null
}

export function pantryIngredients(items: InventoryItem[]): PantryIngredient[] {
  return items.map(i => ({
    itemId: i.id,
    itemName: i.name,
    keywords: itemKeywords(i.name),
    expiresIn: daysUntilExpiry(i),
  }))
}

/** Does this recipe ingredient match any pantry keyword? */
function ingredientMatches(recipeIngredient: string, pantry: PantryIngredient[]): PantryIngredient | null {
  const ing = recipeIngredient.toLowerCase()
  for (const p of pantry) {
    for (const k of p.keywords) {
      // match whole word inside the recipe ingredient ("egg" matches "2 eggs" -> "eggs" via singular)
      if (ing === k || ing.includes(k) || k.includes(ing)) return p
    }
  }
  return null
}

// ---- API calls ----

interface FilterResponse { meals: Array<{ idMeal: string; strMeal: string; strMealThumb: string }> | null }
interface LookupResponse {
  meals: Array<Record<string, string | null>> | null
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** Find recipe summaries that use a given ingredient. */
export async function recipesWith(ingredient: string): Promise<RecipeSummary[]> {
  const q = ingredient.toLowerCase().replace(/\s+/g, '_')
  const data = await fetchJSON<FilterResponse>(`${API}/filter.php?i=${encodeURIComponent(q)}`)
  return (data?.meals ?? []).map(m => ({ id: m.idMeal, name: m.strMeal, thumb: m.strMealThumb }))
}

/** Full recipe details (ingredients, instructions). */
export async function recipeDetails(id: string): Promise<Recipe | null> {
  const data = await fetchJSON<LookupResponse>(`${API}/lookup.php?i=${encodeURIComponent(id)}`)
  const m = data?.meals?.[0]
  if (!m) return null
  const ingredients: string[] = []
  const ingredientLines: string[] = []
  for (let i = 1; i <= 20; i++) {
    const ing = (m[`strIngredient${i}`] ?? '').trim()
    const measure = (m[`strMeasure${i}`] ?? '').trim()
    if (!ing) continue
    ingredients.push(ing.toLowerCase())
    ingredientLines.push(measure ? `${measure} ${ing}` : ing)
  }
  return {
    id: m.idMeal ?? id,
    name: m.strMeal ?? 'Recipe',
    thumb: m.strMealThumb ?? '',
    category: m.strCategory ?? '',
    area: m.strArea ?? '',
    instructions: m.strInstructions ?? '',
    sourceUrl: m.strSource || null,
    youtubeUrl: m.strYoutube || null,
    ingredients,
    ingredientLines,
  }
}

// ---- Recommendation engine ----

/**
 * Recommend dinner recipes from pantry contents.
 * Queries TheMealDB with a few priority ingredients (soonest-expiring first),
 * then scores every candidate by how many of its ingredients the pantry covers.
 */
export async function recommendRecipes(
  items: InventoryItem[],
  { maxResults = 8, candidateLimit = 24 }: { maxResults?: number; candidateLimit?: number } = {},
): Promise<ScoredRecipe[]> {
  const pantry = pantryIngredients(items)
  if (pantry.length === 0) return []

  // Pick up to 3 query ingredients: expiring-soonest first, then longest keyword list.
  const sorted = [...pantry].sort((a, b) => {
    const ea = a.expiresIn ?? 9999
    const eb = b.expiresIn ?? 9999
    return ea - eb
  })
  const queryKeys: string[] = []
  for (const p of sorted) {
    // prefer multi-word phrase or first keyword that is a plausible main ingredient
    const key = p.keywords.find(k => k.includes(' ')) ?? p.keywords[0]
    if (key && !queryKeys.includes(key)) queryKeys.push(key)
    if (queryKeys.length >= 3) break
  }

  // Gather candidate recipes from those ingredients.
  const candidates = new Map<string, RecipeSummary>()
  const lists = await Promise.all(queryKeys.map(recipesWith))
  for (const list of lists) {
    for (const r of list.slice(0, 25)) {
      if (!candidates.has(r.id)) candidates.set(r.id, r)
    }
  }

  // Score by fetching full details (bounded for speed).
  const top = [...candidates.values()].slice(0, candidateLimit)
  const details = await Promise.all(top.map(r => recipeDetails(r.id)))
  const scored: ScoredRecipe[] = []
  for (const d of details) {
    if (!d || d.ingredients.length === 0) continue
    const matchedNames = new Set<string>()
    const missing: string[] = []
    for (const ing of d.ingredients) {
      const hit = ingredientMatches(ing, pantry)
      if (hit) matchedNames.add(hit.itemName)
      else missing.push(ing)
    }
    scored.push({
      ...d,
      matched: [...matchedNames],
      missing,
      score: matchedNames.size / d.ingredients.length,
    })
  }

  return scored
    .filter(r => r.matched.length >= 2) // must use at least 2 things you have
    .sort((a, b) => b.score - a.score || a.missing.length - b.missing.length)
    .slice(0, maxResults)
}

// ---- Custom (user-entered) recipes — scored locally, no network ----

export interface CustomRecipeInput {
  id: string
  name: string
  /** one ingredient per line, as typed by the user */
  ingredientLines: string[]
  instructions: string
  url?: string
}

/** Strip a leading measure ("2 cups", "400g", "a pinch of") to get the ingredient name. */
function stripMeasure(line: string): string {
  return line
    .toLowerCase()
    .replace(/^[\d¼½¾⅓⅔⅛\/.-]+\s*/, '')
    .replace(/^(cups?|tbsp?|tsp|tablespoons?|teaspoons?|grams?|g|kg|oz|ounces?|lbs?|pounds?|ml|l|litres?|liters?|pinch(?:es)?|cloves?|cans?|tins?|packs?|slices?|sprigs?|bunch(?:es)?|handful(?:s)?)\s+(of\s+)?/, '')
    .trim()
}

/** Score the user's own recipes against the pantry — same matching as online recipes. */
export function scoreCustomRecipes(
  items: InventoryItem[],
  customs: CustomRecipeInput[],
): ScoredRecipe[] {
  const pantry = pantryIngredients(items)
  return customs.map(c => {
    const lines = c.ingredientLines.map(l => l.trim()).filter(Boolean)
    const ingredients = lines.map(stripMeasure).filter(Boolean)
    const matchedNames = new Set<string>()
    const missing: string[] = []
    for (const ing of ingredients) {
      const hit = ingredientMatches(ing, pantry)
      if (hit) matchedNames.add(hit.itemName)
      else missing.push(ing)
    }
    return {
      id: `custom-${c.id}`,
      name: c.name,
      thumb: '',
      category: 'My recipes',
      area: '',
      instructions: c.instructions,
      sourceUrl: c.url ?? null,
      youtubeUrl: null,
      ingredients,
      ingredientLines: lines,
      matched: [...matchedNames],
      missing,
      score: ingredients.length > 0 ? matchedNames.size / ingredients.length : 0,
      isCustom: true,
      customId: c.id,
    }
  })
}
