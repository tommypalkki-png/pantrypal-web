// ---- Locations (user-defined) ----

export interface Location {
  id: string
  name: string
  emoji: string
  colorIndex: number
}

export interface LocationColor {
  name: string
  hex: string
  tile: string   // soft background for icon tiles
  text: string   // accent text
  solid: string  // solid button background
}

// All class names are literal so Tailwind JIT keeps them.
export const LOCATION_COLORS: LocationColor[] = [
  { name: 'Orange',  hex: '#f97316', tile: 'bg-orange-100',  text: 'text-orange-600',  solid: 'bg-orange-500' },
  { name: 'Teal',    hex: '#0d9488', tile: 'bg-teal-100',    text: 'text-teal-600',    solid: 'bg-teal-500' },
  { name: 'Indigo',  hex: '#6366f1', tile: 'bg-indigo-100',  text: 'text-indigo-600',  solid: 'bg-indigo-500' },
  { name: 'Rose',    hex: '#e11d48', tile: 'bg-rose-100',    text: 'text-rose-600',    solid: 'bg-rose-500' },
  { name: 'Amber',   hex: '#d97706', tile: 'bg-amber-100',   text: 'text-amber-600',   solid: 'bg-amber-500' },
  { name: 'Emerald', hex: '#059669', tile: 'bg-emerald-100', text: 'text-emerald-600', solid: 'bg-emerald-500' },
  { name: 'Cyan',    hex: '#0891b2', tile: 'bg-cyan-100',    text: 'text-cyan-600',    solid: 'bg-cyan-500' },
  { name: 'Violet',  hex: '#7c3aed', tile: 'bg-violet-100',  text: 'text-violet-600',  solid: 'bg-violet-500' },
]

export const LOCATION_EMOJIS = [
  '🥫', '🧊', '❄️', '🗄️', '🧺', '🥬', '🥤', '🍷',
  '🧂', '🍪', '🥖', '🍯', '🏠', '🚗', '⛺', '📦',
]

export const DEFAULT_LOCATIONS: Location[] = [
  { id: 'pantry',  name: 'Pantry',  emoji: '🥫', colorIndex: 0 },
  { id: 'fridge',  name: 'Fridge',  emoji: '🥬', colorIndex: 1 },
  { id: 'freezer', name: 'Freezer', emoji: '❄️', colorIndex: 2 },
]

export function locationColor(loc: Location | undefined): LocationColor {
  return LOCATION_COLORS[(loc?.colorIndex ?? 0) % LOCATION_COLORS.length]
}

// ---- Categories ----

export type ItemCategory =
  | 'produce' | 'dairyEggs' | 'meat' | 'seafood' | 'grainsPasta' | 'canned'
  | 'spicesCondiments' | 'frozen' | 'beverages' | 'snacks' | 'baking' | 'other'

export const CATEGORIES: Record<ItemCategory, { title: string; emoji: string }> = {
  produce: { title: 'Produce', emoji: '🥬' },
  dairyEggs: { title: 'Dairy & Eggs', emoji: '🥛' },
  meat: { title: 'Meat', emoji: '🥩' },
  seafood: { title: 'Seafood', emoji: '🐟' },
  grainsPasta: { title: 'Grains & Pasta', emoji: '🌾' },
  canned: { title: 'Canned & Jars', emoji: '🥫' },
  spicesCondiments: { title: 'Spices & Condiments', emoji: '🧂' },
  frozen: { title: 'Frozen', emoji: '🧊' },
  beverages: { title: 'Beverages', emoji: '🥤' },
  snacks: { title: 'Snacks', emoji: '🍿' },
  baking: { title: 'Baking', emoji: '🧁' },
  other: { title: 'Other', emoji: '📦' },
}

export const UNITS = [
  'pcs', 'g', 'kg', 'oz', 'lb',
  'ml', 'L', 'fl oz', 'cup', 'pint', 'quart', 'gal',
  'pack', 'box', 'bag', 'bottle', 'can', 'jar', 'dozen',
]

// ---- Items ----

export interface InventoryItem {
  id: string
  name: string
  /** id of a Location */
  location: string
  category: ItemCategory
  quantity: number
  unit: string
  /** ISO date string yyyy-mm-dd, or null */
  expiryDate: string | null
  dateAdded: number
  notes: string
  /**
   * Low-stock threshold: when quantity drops to this value or below,
   * the item is automatically listed on the shopping list.
   * null/undefined = auto-add disabled. (Optional for pre-v7 stored data.)
   */
  restockAt?: number | null
  /**
   * Store the item is usually bought at — used to group the shopping list.
   * Free text; empty/undefined = no store. (Optional for pre-v8 stored data.)
   */
  store?: string
}

/** Display label for an item's store (fallback when unset). */
export function itemStore(item: InventoryItem): string {
  return item.store?.trim() || ''
}

/** True when the item should appear on the shopping list. */
export function isLowStock(item: InventoryItem): boolean {
  return item.restockAt != null && item.quantity <= item.restockAt
}

export type ExpiryStatus = 'expired' | 'urgent' | 'soon' | 'fresh' | 'none'

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysUntilExpiry(item: InventoryItem): number | null {
  if (!item.expiryDate) return null
  const target = new Date(item.expiryDate + 'T00:00:00')
  return Math.round((target.getTime() - startOfToday().getTime()) / 86_400_000)
}

export function expiryStatus(item: InventoryItem): ExpiryStatus {
  const days = daysUntilExpiry(item)
  if (days === null) return 'none'
  if (days < 0) return 'expired'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'soon'
  return 'fresh'
}

export interface Badge {
  text: string
  className: string
}

export function expiryBadge(item: InventoryItem): Badge | null {
  const days = daysUntilExpiry(item)
  if (days === null || !item.expiryDate) return null
  if (days < -1) return { text: `Expired ${-days}d ago`, className: 'bg-red-100 text-red-700' }
  if (days === -1) return { text: 'Expired yesterday', className: 'bg-red-100 text-red-700' }
  if (days === 0) return { text: 'Expires today', className: 'bg-orange-100 text-orange-700' }
  if (days === 1) return { text: '1 day left', className: 'bg-orange-100 text-orange-700' }
  if (days <= 3) return { text: `${days} days left`, className: 'bg-orange-100 text-orange-700' }
  if (days <= 7) return { text: `${days} days left`, className: 'bg-yellow-100 text-yellow-800' }
  const d = new Date(item.expiryDate + 'T00:00:00')
  return {
    text: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    className: 'bg-stone-100 text-stone-500',
  }
}

export function formatQuantity(item: InventoryItem): string {
  const qty = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(1)
  return item.unit ? `${qty} ${item.unit}` : qty
}

export function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---- Location QR payloads ----
// A location QR encodes an absolute deep link into the app:
//   <deployed-url>?add=1&loc=<locationId>
// The in-app scanner also accepts the raw query string or a bare "loc=" param.

export function locationDeepLink(locationId: string): string {
  const base = window.location.origin + window.location.pathname
  return `${base}?add=1&loc=${encodeURIComponent(locationId)}`
}

/** Extract a location id from any scanned QR payload, or null if it isn't one of ours. */
export function parseLocationId(payload: string): string | null {
  const match = payload.match(/[?&#]loc=([A-Za-z0-9_-]+)/)
  if (match) return decodeURIComponent(match[1])
  if (payload.startsWith('pantrypal:loc:')) return payload.slice('pantrypal:loc:'.length)
  return null
}

// ---- Sample data ----

function isoDaysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function sampleItems(): InventoryItem[] {
  const now = Date.now()
  let i = 0
  const make = (
    name: string, location: string, category: ItemCategory,
    quantity: number, unit: string, expiryInDays: number | null, notes = '',
  ): InventoryItem => ({
    id: newId() + (i++),
    name, location, category, quantity, unit,
    expiryDate: expiryInDays === null ? null : isoDaysFromNow(expiryInDays),
    dateAdded: now - i * 60_000,
    notes,
  })

  const items = [
    make('Spaghetti', 'pantry', 'grainsPasta', 2, 'pack', null),
    make('Basmati rice', 'pantry', 'grainsPasta', 1, 'bag', null),
    make('Chopped tomatoes', 'pantry', 'canned', 4, 'can', 240),
    make('Chickpeas', 'pantry', 'canned', 3, 'can', 180),
    make('Olive oil', 'pantry', 'spicesCondiments', 1, 'bottle', null),
    make('Sea salt', 'pantry', 'spicesCondiments', 1, 'jar', null),
    make('Granola', 'pantry', 'snacks', 1, 'box', 45),

    make('Whole milk', 'fridge', 'dairyEggs', 1, 'bottle', 2),
    make('Greek yogurt', 'fridge', 'dairyEggs', 2, 'pcs', 5),
    make('Eggs', 'fridge', 'dairyEggs', 1, 'dozen', 10),
    make('Chicken breast', 'fridge', 'meat', 500, 'g', -1, 'Use or freeze ASAP'),
    make('Baby spinach', 'fridge', 'produce', 1, 'bag', 1),
    make('Carrots', 'fridge', 'produce', 6, 'pcs', 12),
    make('Orange juice', 'fridge', 'beverages', 1, 'bottle', 4),

    make('Salmon fillets', 'freezer', 'seafood', 4, 'pcs', 90),
    make('Frozen peas', 'freezer', 'frozen', 1, 'bag', 150),
    make('Vanilla ice cream', 'freezer', 'frozen', 1, 'box', 60),
    make('Bread loaf', 'freezer', 'grainsPasta', 1, 'pcs', null),
  ]

  // Demo the low-stock rule: milk and eggs auto-join the shopping list when running out.
  for (const item of items) {
    if (item.name === 'Whole milk' || item.name === 'Eggs') item.restockAt = 1
  }
  // Demo store grouping on the shopping list.
  for (const item of items) {
    if (item.name === 'Whole milk' || item.name === 'Greek yogurt' || item.name === 'Orange juice') item.store = 'Costco'
    if (item.name === 'Eggs' || item.name === 'Chicken breast' || item.name === 'Baby spinach') item.store = 'Trader Joe’s'
  }
  return items
}
