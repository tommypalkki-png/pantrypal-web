import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, QrCode, Trash2 } from 'lucide-react'
import type { InventoryItem, Location } from '@/types/inventory'
import { LOCATION_COLORS, LOCATION_EMOJIS, locationColor } from '@/types/inventory'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
  items: InventoryItem[]
  onAdd: (name: string, emoji: string, colorIndex: number) => void
  onRename: (id: string, name: string) => void
  /** Parent is responsible for also removing the location's items. */
  onDelete: (id: string) => void
  onShowQRCodes: () => void
}

export function ManageLocationsDialog({
  open, onOpenChange, locations, items, onAdd, onRename, onDelete, onShowQRCodes,
}: Props) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(LOCATION_EMOJIS[0])
  const [colorIndex, setColorIndex] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<Location | null>(null)

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed, emoji, colorIndex)
    setName('')
  }

  const pendingCount = pendingDelete
    ? items.filter(i => i.location === pendingDelete.id).length
    : 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage locations</DialogTitle>
          </DialogHeader>

          {/* Existing locations */}
          <div className="grid grid-cols-1 gap-2">
            {locations.map(loc => {
              const c = locationColor(loc)
              const count = items.filter(i => i.location === loc.id).length
              return (
                <div key={loc.id} className="flex items-center gap-2">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${c.tile}`}>
                    {loc.emoji}
                  </span>
                  <Input
                    value={loc.name}
                    onChange={e => onRename(loc.id, e.target.value)}
                    className="h-9"
                  />
                  <span className="w-14 shrink-0 text-right text-xs text-stone-400">
                    {count} item{count === 1 ? '' : 's'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-stone-400 hover:text-red-600"
                    disabled={locations.length <= 1}
                    onClick={() => setPendingDelete(loc)}
                    aria-label={`Delete ${loc.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Add new */}
          <div className="mt-2 rounded-xl border border-stone-200 p-3">
            <p className="mb-2 text-sm font-semibold text-stone-700">Add a location</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Garage freezer, Spice cabinet"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && add()}
              />
              <Button type="button" onClick={add} disabled={!name.trim()}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>

            <p className="mb-1.5 mt-3 text-xs font-medium text-stone-500">Icon</p>
            <div className="grid grid-cols-8 gap-1">
              {LOCATION_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`flex h-8 items-center justify-center rounded-lg text-base transition-colors ${
                    emoji === e ? 'bg-stone-200 ring-2 ring-stone-400' : 'hover:bg-stone-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            <p className="mb-1.5 mt-3 text-xs font-medium text-stone-500">Color</p>
            <div className="flex gap-2">
              {LOCATION_COLORS.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColorIndex(i)}
                  aria-label={c.name}
                  style={{ backgroundColor: c.hex }}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    colorIndex === i ? 'scale-110 ring-2 ring-stone-500 ring-offset-2' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <Button type="button" variant="outline" onClick={onShowQRCodes}>
            <QrCode className="mr-2 h-4 w-4" /> Location QR codes (print & stick)
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCount > 0
                ? `This location has ${pendingCount} item${pendingCount === 1 ? '' : 's'} — ${pendingCount === 1 ? 'it' : 'they'} will be permanently deleted too.`
                : 'This location is empty and will be removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              {pendingCount > 0 ? 'Delete all' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
