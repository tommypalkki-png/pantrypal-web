import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Barcode, Minus, Plus, ScanLine, Trash2 } from 'lucide-react'
import type { InventoryItem, ItemCategory, Location } from '@/types/inventory'
import { CATEGORIES, UNITS, newId, parseLocationId } from '@/types/inventory'
import { looksLikeBarcode, lookupProduct } from '@/lib/openfoodfacts'
import { ScanDialog } from '@/components/ScanDialog'

export interface ItemDraft {
  name?: string
  locationId?: string
  /** product barcode to look up when the form opens */
  barcode?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = adding a new item */
  item: InventoryItem | null
  /** prefill for new items (from deep link or scan) */
  draft: ItemDraft | null
  locations: Location[]
  /** store names already in use — offered as autocomplete suggestions */
  stores?: string[]
  onSave: (item: InventoryItem) => void
  onDelete?: (id: string) => void
}

function defaultExpiry(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

type LookupState =
  | { kind: 'idle' }
  | { kind: 'searching'; barcode: string }
  | { kind: 'found'; name: string }
  | { kind: 'miss'; barcode: string }

export function ItemFormDialog({ open, onOpenChange, item, draft, locations, stores = [], onSave, onDelete }: Props) {
  const [name, setName] = useState('')
  const [locationId, setLocationId] = useState('')
  const [category, setCategory] = useState<ItemCategory>('other')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('pcs')
  const [hasExpiry, setHasExpiry] = useState(false)
  const [expiryDate, setExpiryDate] = useState(defaultExpiry())
  const [restockEnabled, setRestockEnabled] = useState(false)
  const [restockAt, setRestockAt] = useState(1)
  const [store, setStore] = useState('')
  const [notes, setNotes] = useState('')
  const [scanPurpose, setScanPurpose] = useState<'location' | 'barcode' | null>(null)
  const [scanMsg, setScanMsg] = useState<string | null>(null)
  const [lookup, setLookup] = useState<LookupState>({ kind: 'idle' })

  // Reset the form every time the dialog opens
  useEffect(() => {
    if (!open) return
    const fallbackLoc = draft?.locationId ?? locations[0]?.id ?? ''
    setName(item?.name ?? draft?.name ?? '')
    setLocationId(
      item?.location
      ?? (locations.some(l => l.id === fallbackLoc) ? fallbackLoc : locations[0]?.id ?? ''),
    )
    setCategory(item?.category ?? 'other')
    setQuantity(item?.quantity ?? 1)
    setUnit(item?.unit ?? 'pcs')
    setHasExpiry(item?.expiryDate != null)
    setExpiryDate(item?.expiryDate ?? defaultExpiry())
    setRestockEnabled(item?.restockAt != null)
    setRestockAt(item?.restockAt ?? 1)
    setStore(item?.store ?? '')
    setNotes(item?.notes ?? '')
    setScanMsg(null)
    setLookup({ kind: 'idle' })
  }, [open, item, draft, locations])

  // Barcode lookup when the form opens with a scanned barcode
  useEffect(() => {
    if (!open || item || !draft?.barcode) return
    const barcode = draft.barcode
    let cancelled = false
    setLookup({ kind: 'searching', barcode })
    lookupProduct(barcode).then(info => {
      if (cancelled) return
      if (info?.name) {
        setLookup({ kind: 'found', name: info.name })
        setName(info.name)
        if (info.quantity != null && info.unit) {
          setQuantity(info.quantity)
          setUnit(info.unit)
        }
        if (info.brand) setNotes(prev => prev || info.brand!)
      } else {
        setLookup({ kind: 'miss', barcode })
        setNotes(prev => prev || `Barcode ${barcode}`)
      }
    })
    return () => { cancelled = true }
  }, [open, item, draft])

  const trimmed = name.trim()

  const save = () => {
    if (!trimmed || !locationId) return
    onSave({
      id: item?.id ?? newId(),
      name: trimmed,
      location: locationId,
      category,
      quantity,
      unit,
      expiryDate: hasExpiry ? expiryDate : null,
      dateAdded: item?.dateAdded ?? Date.now(),
      notes: notes.trim(),
      restockAt: restockEnabled ? restockAt : null,
      store: store.trim() || undefined,
    })
    onOpenChange(false)
  }

  const bump = (delta: number) =>
    setQuantity(q => Math.max(0, Math.round((q + delta) * 10) / 10))

  const handleScan = (text: string) => {
    setScanPurpose(null)
    if (scanPurpose === 'location') {
      const id = parseLocationId(text)
      if (id && locations.some(l => l.id === id)) {
        setLocationId(id)
        setScanMsg(null)
      } else {
        setScanMsg('That code is not one of your location QRs.')
      }
      return
    }
    // barcode scan from within the form
    const locId = parseLocationId(text)
    if (locId && locations.some(l => l.id === locId)) {
      setLocationId(locId)
      return
    }
    if (looksLikeBarcode(text)) {
      setLookup({ kind: 'searching', barcode: text })
      lookupProduct(text).then(info => {
        if (info?.name) {
          setLookup({ kind: 'found', name: info.name })
          setName(info.name)
          if (info.quantity != null && info.unit) {
            setQuantity(info.quantity)
            setUnit(info.unit)
          }
          if (info.brand) setNotes(prev => prev || info.brand!)
        } else {
          setLookup({ kind: 'miss', barcode: text })
          setNotes(prev => prev || `Barcode ${text}`)
        }
      })
      return
    }
    setName(prev => prev || text.slice(0, 120))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  placeholder="e.g. Greek yogurt"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Scan product barcode"
                  onClick={() => setScanPurpose('barcode')}
                >
                  <Barcode className="h-4 w-4" />
                </Button>
              </div>
              {lookup.kind === 'searching' && (
                <p className="text-xs text-stone-500">Looking up barcode {lookup.barcode}…</p>
              )}
              {lookup.kind === 'found' && (
                <p className="text-xs text-emerald-600">Found: {lookup.name}</p>
              )}
              {lookup.kind === 'miss' && (
                <p className="text-xs text-amber-600">
                  Barcode {lookup.barcode} not in Open Food Facts — fill in the name yourself.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Location</Label>
              <div className="flex gap-2">
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.emoji} {l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Scan location QR"
                  onClick={() => setScanPurpose('location')}
                >
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
              {scanMsg && <p className="text-xs text-red-600">{scanMsg}</p>}
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as ItemCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORIES) as ItemCategory[]).map(c => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIES[c].emoji} {CATEGORIES[c].title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => bump(quantity <= 10 ? -0.5 : -1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center text-lg font-semibold tabular-nums">
                  {Number.isInteger(quantity) ? quantity : quantity.toFixed(1)}
                </span>
                <Button type="button" variant="outline" size="icon" onClick={() => bump(quantity < 10 ? 0.5 : 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="has-expiry">Has expiry date</Label>
                <Switch id="has-expiry" checked={hasExpiry} onCheckedChange={setHasExpiry} />
              </div>
              {hasExpiry && (
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                />
              )}
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="restock">Add to shopping list when low</Label>
                <Switch id="restock" checked={restockEnabled} onCheckedChange={setRestockEnabled} />
              </div>
              {restockEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-500">When quantity drops to</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setRestockAt(v => Math.max(0, v - 1))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center font-semibold tabular-nums">{restockAt}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setRestockAt(v => Math.min(99, v + 1))}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span className="text-sm text-stone-500">or below</span>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="store">Store (optional)</Label>
              <Input
                id="store"
                list="store-suggestions"
                placeholder="e.g. Costco — groups your shopping list"
                value={store}
                onChange={e => setStore(e.target.value)}
              />
              <datalist id="store-suggestions">
                {stores.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Brand, where you bought it…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {item && onDelete && (
              <Button
                type="button"
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => { onDelete(item.id); onOpenChange(false) }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            )}
            <Button type="button" className="flex-1" disabled={!trimmed} onClick={save}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ScanDialog
        open={scanPurpose !== null}
        onOpenChange={o => !o && setScanPurpose(null)}
        onScan={handleScan}
        title={scanPurpose === 'location' ? 'Scan location QR' : 'Scan product barcode'}
      />
    </>
  )
}
