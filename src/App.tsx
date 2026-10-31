import { useState } from 'react'
import type { InventoryItem, StorageLocation } from '@/types/inventory'
import { LOCATIONS } from '@/types/inventory'
import { useInventory } from '@/hooks/useInventory'
import { Dashboard } from '@/sections/Dashboard'
import { LocationView } from '@/sections/LocationView'
import { ItemFormDialog } from '@/components/ItemFormDialog'
import { House, Package, Refrigerator, Snowflake, Plus } from 'lucide-react'

type Tab = 'home' | StorageLocation

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'pantry', label: 'Pantry', icon: Package },
  { id: 'fridge', label: 'Fridge', icon: Refrigerator },
  { id: 'freezer', label: 'Freezer', icon: Snowflake },
]

export default function App() {
  const { items, addItem, updateItem, deleteItem } = useInventory()
  const [tab, setTab] = useState<Tab>('home')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const save = (item: InventoryItem) => {
    if (editingItem) updateItem(item)
    else addItem(item)
  }

  const defaultLocation: StorageLocation = tab === 'home' ? 'pantry' : tab

  const title = tab === 'home' ? 'Kitchen Inventory' : LOCATIONS[tab].title

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-stone-100/90 px-4 pb-3 pt-5 backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight text-stone-800">{title}</h1>
        {tab === 'home' && (
          <p className="mt-0.5 text-sm text-stone-400">
            {items.length} item{items.length === 1 ? '' : 's'} across your kitchen
          </p>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        {tab === 'home' ? (
          <Dashboard
            items={items}
            onSelectLocation={loc => setTab(loc)}
            onSelectItem={openEdit}
          />
        ) : (
          <LocationView
            location={tab}
            items={items}
            onAdd={openAdd}
            onSelectItem={openEdit}
          />
        )}
      </main>

      {/* Floating add button */}
      <button
        type="button"
        onClick={openAdd}
        aria-label="Add item"
        style={{ right: 'max(1.25rem, calc(50% - 12.75rem))' }}
        className="fixed bottom-24 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-stone-800 text-white shadow-lg transition-transform active:scale-90"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="grid grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            const accent = id === 'home' ? 'text-stone-800' : LOCATIONS[id as StorageLocation].accent
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? accent : 'text-stone-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            )
          })}
        </div>
      </nav>

      <ItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        defaultLocation={defaultLocation}
        onSave={save}
        onDelete={deleteItem}
      />
    </div>
  )
}
