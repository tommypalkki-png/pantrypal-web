import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import QRCode from 'react-qr-code'
import { Printer } from 'lucide-react'
import type { Location } from '@/types/inventory'
import { locationDeepLink, locationColor } from '@/types/inventory'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
}

/**
 * Shows one QR per location. Scanning a code with any camera app opens the app
 * at the add-item form with that location pre-selected; the in-app scanner
 * understands the same codes.
 */
export function LocationQRDialog({ open, onOpenChange, locations }: Props) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Location QR codes</DialogTitle>
          </DialogHeader>

          <p className="text-xs leading-relaxed text-stone-500">
            Print these and stick them on each door / cabinet. Scan one while adding an
            item and the location is filled in for you. Codes encode this app's current
            web address — print after deploying so they point at your live URL.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {locations.map(loc => (
              <div
                key={loc.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 p-3"
              >
                <QRCode value={locationDeepLink(loc.id)} size={120} />
                <span className="text-sm font-semibold text-stone-700">
                  {loc.emoji} {loc.name}
                </span>
                <span className={`h-1.5 w-10 rounded-full ${locationColor(loc).solid}`} />
              </div>
            ))}
          </div>

          <Button type="button" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print QR sheet
          </Button>
        </DialogContent>
      </Dialog>

      {/* Print-only sheet */}
      <div id="print-sheet" aria-hidden>
        <h1>PantryPal — Location QR codes</h1>
        <p>Scan a code to add an item straight into that location.</p>
        <div className="print-grid">
          {locations.map(loc => (
            <div key={loc.id} className="print-card">
              <QRCode value={locationDeepLink(loc.id)} size={170} />
              <strong>{loc.emoji} {loc.name}</strong>
              <small>{locationDeepLink(loc.id)}</small>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
