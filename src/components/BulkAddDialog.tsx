import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { InventoryItem, ItemCategory, Location } from '@/types/inventory'
import { CATEGORIES, locationColor, newId } from '@/types/inventory'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the location whose tab the dialog was opened from (default target) */
  location: Location
  /** all locations — lines can re-route themselves with a hint */
  locations: Location[]
  onSave: (items: InventoryItem[]) => void
}

export interface ParsedLine {
  name: string
  quantity: number
  category: ItemCategory
  /** location id after applying any hint */
  locationId: string
  /** true when a category hint was recognized */
  categoryFromHint: boolean
  /** true when a location hint was recognized */
  locationFromHint: boolean
}

/** Aliases so people can write natural words: (dairy), (veg), (drinks)… */
const CATEGORY_ALIASES: Record<string, ItemCategory> = {
  produce: 'produce', veg: 'produce', vegs: 'produce', vegetable: 'produce',
  vegetables: 'produce', fruit: 'produce', fruits: 'produce', salad: 'produce',
  dairy: 'dairyEggs', egg: 'dairyEggs', eggs: 'dairyEggs', milk: 'dairyEggs',
  cheese: 'dairyEggs', yogurt: 'dairyEggs', yoghurt: 'dairyEggs',
  meat: 'meat', chicken: 'meat', beef: 'meat', pork: 'meat', lamb: 'meat',
  seafood: 'seafood', fish: 'seafood', prawns: 'seafood', shrimp: 'seafood',
  grains: 'grainsPasta', grain: 'grainsPasta', pasta: 'grainsPasta',
  rice: 'grainsPasta', bread: 'grainsPasta', cereal: 'grainsPasta', noodles: 'grainsPasta',
  canned: 'canned', cans: 'canned', tin: 'canned', tins: 'canned',
  tinned: 'canned', jar: 'canned', jars: 'canned',
  spices: 'spicesCondiments', spice: 'spicesCondiments',
  condiments: 'spicesCondiments', condiment: 'spicesCondiments',
  sauce: 'spicesCondiments', sauces: 'spicesCondiments', herbs: 'spicesCondiments',
  frozen: 'frozen', freezer: 'frozen',
  beverages: 'beverages', beverage: 'beverages', drink: 'beverages',
  drinks: 'beverages', juice: 'beverages', soda: 'beverages',
  snacks: 'snacks', snack: 'snacks', crisps: 'snacks', chips: 'snacks',
  baking: 'baking', bake: 'baking', flour: 'baking', sugar: 'baking',
  other: 'other',
}

function matchCategory(hint: string): ItemCategory | null {
  const h = hint.toLowerCase().trim()
  if (CATEGORY_ALIASES[h]) return CATEGORY_ALIASES[h]
  // also try the official titles ("Grains & Pasta")
  for (const [key, { title }] of Object.entries(CATEGORIES)) {
    if (title.toLowerCase() === h) return key as ItemCategory
  }
  return null
}

function matchLocation(hint: string, locations: Location[]): Location | null {
  const h = hint.toLowerCase().trim()
  return locations.find(l => l.name.toLowerCase() === h || l.id.toLowerCase() === h) ?? null
}

/**
 * Parse one item per line:
 *   "2 Milk (dairy)"        -> qty 2, category dairyEggs
 *   "Chicken — fridge"      -> routed to the Fridge location
 *   "Rice (grains) x3"      -> qty 3, category grainsPasta
 * A hint is anything in (parentheses) or after a " - " / " — " dash.
 */
export function parseBulkLines(
  text: string,
  locations: Location[],
  defaultLocationId: string,
): ParsedLine[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(line => {
      // Extract hint: (parentheses) or trailing dash segment
      let hint: string | null = null
      let body = line
      const paren = body.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
      const dash = body.match(/^(.*?)\s*[-–—]\s*([^-–—]+)$/)
      if (paren) {
        body = paren[1]
        hint = paren[2]
      } else if (dash && !/^\d/.test(dash[2])) {
        body = dash[1]
        hint = dash[2]
      }

      // A hint that matches one of the user's location names wins over
      // category aliases ("Ice cream — freezer" routes to the Freezer).
      const locationHint = hint ? matchLocation(hint, locations) : null
      const categoryHint = hint && !locationHint ? matchCategory(hint) : null

      // Quantity: "2 milk", "2x milk", "milk x2"
      let quantity = 1
      let name = body
      let m = body.match(/^(\d+(?:\.\d+)?)\s*x?\s+(.+)$/)
      if (m) {
        quantity = Math.min(999, parseFloat(m[1]))
        name = m[2]
      } else {
        m = body.match(/^(.+?)\s+[x×]\s*(\d+(?:\.\d+)?)$/i)
        if (m) {
          name = m[1]
          quantity = Math.min(999, parseFloat(m[2]))
        }
      }

      return {
        name: name.trim(),
        quantity,
        category: categoryHint ?? 'other',
        locationId: locationHint?.id ?? defaultLocationId,
        categoryFromHint: categoryHint !== null,
        locationFromHint: locationHint !== null,
      }
    })
    .filter(p => p.name.length > 0)
}

export function BulkAddDialog({ open, onOpenChange, location, locations, onSave }: Props) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) setText('')
  }, [open])

  const parsed = parseBulkLines(text, locations, location.id)
  const c = locationColor(location)
  const locName = (id: string) => locations.find(l => l.id === id)?.name ?? id

  const save = () => {
    if (parsed.length === 0) return
    const now = Date.now()
    onSave(parsed.map((p, i) => ({
      id: newId() + i,
      name: p.name,
      location: p.locationId,
      category: p.category,
      quantity: p.quantity,
      unit: 'pcs',
      expiryDate: null,
      dateAdded: now - i,
      notes: '',
      restockAt: null,
    })))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Bulk add to {location.emoji} {location.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2">
          <Label htmlFor="bulk-items">One item per line</Label>
          <Textarea
            id="bulk-items"
            autoFocus
            rows={9}
            placeholder={'Milk (dairy)\n2 Eggs (dairy)\nChicken breast (meat)\nIce cream — freezer\nRice x2'}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <p className="text-xs leading-relaxed text-stone-400">
            Tips: a number first sets the quantity (“2 Eggs”). Add a hint in
            brackets for the category — “Milk (dairy)” — or a dash and a place
            to file it elsewhere — “Ice cream — freezer”. Categories: produce,
            dairy, meat, fish, grains, pasta, canned, spices, frozen, drinks,
            snacks, baking.
          </p>

          {parsed.length > 0 && (
            <div className={`rounded-xl p-3 ${c.tile}`}>
              <p className={`text-sm font-medium ${c.text}`}>
                {parsed.length} item{parsed.length === 1 ? '' : 's'} ready
              </p>
              <ul className="mt-1 grid gap-0.5">
                {parsed.slice(0, 8).map((p, i) => (
                  <li key={i} className="text-xs text-stone-600">
                    {p.name}
                    {p.quantity > 1 && ` ×${p.quantity}`}
                    <span className="text-stone-400">
                      {' → '}
                      {p.categoryFromHint ? CATEGORIES[p.category].title : 'Other'}
                      {p.locationId !== location.id && ` · ${locName(p.locationId)}`}
                    </span>
                  </li>
                ))}
                {parsed.length > 8 && (
                  <li className="text-xs text-stone-400">+{parsed.length - 8} more…</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <Button type="button" className="w-full" disabled={parsed.length === 0} onClick={save}>
          Add {parsed.length > 0 ? parsed.length : ''} item{parsed.length === 1 ? '' : 's'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
