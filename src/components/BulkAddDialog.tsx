import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { InventoryItem, Location } from '@/types/inventory'
import { locationColor, newId } from '@/types/inventory'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: Location
  onSave: (items: InventoryItem[]) => void
}

export interface ParsedLine {
  name: string
  quantity: number
}

/**
 * Parse one item per line. Quantity comes from a leading number
 * ("2 milk") or trailing multiplier ("milk x2"). Anything after
 * a dash goes nowhere — we keep the whole name simple.
 */
export function parseBulkLines(text: string): ParsedLine[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(line => {
      // "2 milk" / "2x milk" / "2 x milk"
      let m = line.match(/^(\d+(?:\.\d+)?)\s*x?\s+(.+)$/)
      if (m) return { name: m[2].trim(), quantity: Math.min(999, parseFloat(m[1])) }
      // "milk x2" / "milk 2"
      m = line.match(/^(.+?)\s+[x×]\s*(\d+(?:\.\d+)?)$/i)
      if (m) return { name: m[1].trim(), quantity: Math.min(999, parseFloat(m[2])) }
      return { name: line, quantity: 1 }
    })
    .filter(p => p.name.length > 0)
}

export function BulkAddDialog({ open, onOpenChange, location, onSave }: Props) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) setText('')
  }, [open])

  const parsed = parseBulkLines(text)
  const c = locationColor(location)

  const save = () => {
    if (parsed.length === 0) return
    const now = Date.now()
    onSave(parsed.map((p, i) => ({
      id: newId() + i,
      name: p.name,
      location: location.id,
      category: 'other' as const,
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

        <div className="grid gap-3 py-2">
          <Label htmlFor="bulk-items">One item per line</Label>
          <Textarea
            id="bulk-items"
            autoFocus
            rows={9}
            placeholder={'Milk\n2 Eggs\nBread x1\nChicken breast\nRice'}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <p className="text-xs leading-relaxed text-stone-400">
            Tip: put a number first for quantity — “2 Eggs” adds two.
            Everything is added as “Other / pcs”; tap an item afterwards
            to set its category, unit, expiry and low-stock alert.
          </p>

          {parsed.length > 0 && (
            <div className={`rounded-xl p-3 text-sm ${c.tile}`}>
              <span className={`font-medium ${c.text}`}>
                {parsed.length} item{parsed.length === 1 ? '' : 's'} ready:
              </span>{' '}
              <span className="text-stone-600">
                {parsed.slice(0, 6).map(p => (p.quantity > 1 ? `${p.name} ×${p.quantity}` : p.name)).join(', ')}
                {parsed.length > 6 && ` +${parsed.length - 6} more`}
              </span>
            </div>
          )}
        </div>

        <Button type="button" className="w-full" disabled={parsed.length === 0} onClick={save}>
          Add {parsed.length > 0 ? parsed.length : ''} item{parsed.length === 1 ? '' : 's'} to {location.name}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
