export type StorageLocation = 'pantry' | 'fridge' | 'freezer'

export type ItemCategory =
  | 'produce' | 'dairyEggs' | 'meat' | 'seafood' | 'grainsPasta' | 'canned'
  | 'spicesCondiments' | 'frozen' | 'beverages' | 'snacks' | 'baking' | 'other'

export interface InventoryItem {
  id: string
  name: string
  location: StorageLocation
  category: ItemCategory
  quantity: number
  unit: string
  /** ISO date string yyyy-mm-dd, or null */
  expiryDate: string | null
  dateAdded: number
  notes: string
}

export const LOCATIONS: Record<StorageLocation, {
  title: string
  color: string        // accent hex
  tileBg: string       // tailwind class for icon tiles
  accent: string       // tailwind text class
  ring: string         // tailwind ring/bg class for active states
}> = {
  pantry: {
    title: 'Pantry',
    color: '#f97316',
    tileBg: 'bg-orange-100',
    accent: 'text-orange-600',
    ring: 'bg-orange-500',
  },
  fridge: {
    title: 'Fridge',
    color: '#0d9488',
    tileBg: 'bg-teal-100',
    accent: 'text-teal-600',
    ring: 'bg-teal-500',
  },
  freezer: {
    title: 'Freezer',
    color: '#6366f1',
    tileBg: 'bg-indigo-100',
    accent: 'text-indigo-600',
    ring: 'bg-indigo-500',
  },
}

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

export const UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'pack', 'box', 'bag', 'bottle', 'can', 'jar', 'dozen']

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

function isoDaysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function sampleItems(): InventoryItem[] {
  const now = Date.now()
  let i = 0
  const make = (
    name: string, location: StorageLocation, category: ItemCategory,
    quantity: number, unit: string, expiryInDays: number | null, notes = '',
  ): InventoryItem => ({
    id: newId() + (i++),
    name, location, category, quantity, unit,
    expiryDate: expiryInDays === null ? null : isoDaysFromNow(expiryInDays),
    dateAdded: now - i * 60_000,
    notes,
  })

  return [
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
}
