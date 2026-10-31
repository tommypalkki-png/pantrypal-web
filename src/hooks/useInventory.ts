import { useEffect, useState } from 'react'
import type { InventoryItem } from '@/types/inventory'
import { sampleItems } from '@/types/inventory'

const ITEMS_KEY = 'pantrypal-items-v1'
const SEEDED_KEY = 'pantrypal-seeded-v1'

function load(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY)
    if (raw) return JSON.parse(raw) as InventoryItem[]
  } catch {
    // corrupted storage — fall through to seed
  }
  if (!localStorage.getItem(SEEDED_KEY)) {
    localStorage.setItem(SEEDED_KEY, '1')
    return sampleItems()
  }
  return []
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(load)

  useEffect(() => {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
  }, [items])

  const addItem = (item: InventoryItem) => setItems(prev => [...prev, item])
  const updateItem = (item: InventoryItem) =>
    setItems(prev => prev.map(p => (p.id === item.id ? item : p)))
  const deleteItem = (id: string) => setItems(prev => prev.filter(p => p.id !== id))

  return { items, addItem, updateItem, deleteItem }
}
