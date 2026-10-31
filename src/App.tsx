import { useEffect, useState } from 'react'
import type { InventoryItem, Location } from '@/types/inventory'
import { locationColor, parseLocationId } from '@/types/inventory'
import { looksLikeBarcode } from '@/lib/openfoodfacts'
import { useInventory } from '@/hooks/useInventory'
import { useLocations } from '@/hooks/useLocations'
import { Dashboard } from '@/sections/Dashboard'
import { LocationView } from '@/sections/LocationView'
import { ItemFormDialog, type ItemDraft } from '@/components/ItemFormDialog'
import { ManageLocationsDialog } from '@/components/ManageLocationsDialog'
import { LocationQRDialog } from '@/components/LocationQRDialog'
import { ScanDialog } from '@/components/ScanDialog'
import { House, Plus, ScanLine, Settings2 } from 'lucide-react'

const HOME = 'home'

export default function App() {
  const { items, addItem, updateItem, deleteItem } = useInventory()
  const { locations, addLocation, renameLocation, deleteLocation } = useLocations()

  const [tab, setTab] = useState<string>(HOME)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [draft, setDraft] = useState<ItemDraft | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)

  // Deep link: ?add=1&loc=<id> opens the add form for that location
  // (this is what the printed location QR codes encode).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const loc = params.get('loc')
    if (params.get('add') || loc) {
      setEditingItem(null)
      setDraft({ locationId: loc ?? undefined })
      setFormOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAdd = (d: ItemDraft | null = null) => {
    setEditingItem(null)
    setDraft(d)
    setFormOpen(true)
  }

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setDraft(null)
    setFormOpen(true)
  }

  const save = (item: InventoryItem) => {
    if (editingItem) updateItem(item)
    else addItem(item)
  }

  /** Header scanner: location QR -> add form for that location;
   *  product barcode -> add form with OFF lookup; anything else -> prefill the name. */
  const handleScan = (text: string) => {
    setScanOpen(false)
    const locId = parseLocationId(text)
    if (locId && locations.some(l => l.id === locId)) {
      openAdd({ locationId: locId })
    } else if (looksLikeBarcode(text)) {
      openAdd({ barcode: text })
    } else {
      openAdd({ name: text.slice(0, 120) })
    }
  }

  const handleDeleteLocation = (id: string) => {
    for (const item of items.filter(i => i.location === id)) deleteItem(item.id)
    deleteLocation(id)
    if (tab === id) setTab(HOME)
  }

  const activeLocation: Location | undefined =
    tab === HOME ? undefined : locations.find(l => l.id === tab)

  const title = tab === HOME ? 'Kitchen Inventory' : (activeLocation?.name ?? 'Kitchen Inventory')

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-stone-100/90 px-4 pb-3 pt-5 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-stone-800">{title}</h1>
            {tab === HOME && (
              <p className="mt-0.5 text-sm text-stone-400">
                {items.length} item{items.length === 1 ? '' : 's'} in {locations.length} location{locations.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-label="Scan QR code"
              onClick={() => setScanOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200"
            >
              <ScanLine className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Manage locations"
              onClick={() => setManageOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200"
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {tab === HOME || !activeLocation ? (
          <Dashboard
            items={items}
            locations={locations}
            onSelectLocation={setTab}
            onSelectItem={openEdit}
          />
        ) : (
          <LocationView
            location={activeLocation}
            items={items}
            onAdd={() => openAdd({ locationId: activeLocation.id })}
            onSelectItem={openEdit}
          />
        )}
      </main>

      {/* Floating add button */}
      <button
        type="button"
        onClick={() => openAdd()}
        aria-label="Add item"
        style={{ right: 'max(1.25rem, calc(50% - 12.75rem))' }}
        className="fixed bottom-24 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-stone-800 text-white shadow-lg transition-transform active:scale-90"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom tab bar — scrolls horizontally when there are many locations */}
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="flex overflow-x-auto">
          <TabButton
            active={tab === HOME}
            label="Home"
            icon={<House className="h-5 w-5" />}
            onClick={() => setTab(HOME)}
          />
          {locations.map(loc => {
            const c = locationColor(loc)
            return (
              <TabButton
                key={loc.id}
                active={tab === loc.id}
                label={loc.name}
                activeClass={c.text}
                icon={<span className="text-xl leading-none">{loc.emoji}</span>}
                onClick={() => setTab(loc.id)}
              />
            )
          })}
        </div>
      </nav>

      {/* Dialogs */}
      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        draft={draft}
        locations={locations}
        onSave={save}
        onDelete={deleteItem}
      />

      <ManageLocationsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        locations={locations}
        items={items}
        onAdd={(name, emoji, colorIndex) => { addLocation(name, emoji, colorIndex) }}
        onRename={renameLocation}
        onDelete={handleDeleteLocation}
        onShowQRCodes={() => { setManageOpen(false); setQrOpen(true) }}
      />

      <LocationQRDialog open={qrOpen} onOpenChange={setQrOpen} locations={locations} />

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} onScan={handleScan} />
    </div>
  )
}

function TabButton({ active, label, icon, onClick, activeClass = 'text-stone-800' }: {
  active: boolean
  label: string
  icon: React.ReactNode
  onClick: () => void
  activeClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
        active ? activeClass : 'text-stone-400'
      }`}
    >
      {icon}
      <span className="max-w-[5.5rem] truncate">{label}</span>
    </button>
  )
}
