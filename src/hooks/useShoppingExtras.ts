import { useEffect, useState } from 'react'
import { newId } from '@/types/inventory'

/** A manually-added shopping list entry (e.g. missing recipe ingredients). */
export interface ShoppingExtra {
  id: string
  name: string
  /** which recipe it came from, if any */
  fromRecipe?: string
  addedAt: number
}

const KEY = 'pantrypal-shopping-extras-v1'

function load(): ShoppingExtra[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as ShoppingExtra[]
  } catch {
    // corrupted storage — start empty
  }
  return []
}

export function useShoppingExtras() {
  const [extras, setExtras] = useState<ShoppingExtra[]>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(extras))
  }, [extras])

  /** Add entries, skipping names already on the list (case-insensitive). Returns how many were added. */
  const addExtras = (names: string[], fromRecipe?: string): number => {
    const existing = new Set(extras.map(e => e.name.toLowerCase()))
    const fresh = names
      .map(n => n.trim())
      .filter(n => n.length > 0 && !existing.has(n.toLowerCase()))
      .map(name => ({ id: newId(), name, fromRecipe, addedAt: Date.now() }))
    if (fresh.length > 0) setExtras(prev => [...prev, ...fresh])
    return fresh.length
  }

  const removeExtra = (id: string) => setExtras(prev => prev.filter(e => e.id !== id))
  const clearExtras = () => setExtras([])

  return { extras, addExtras, removeExtra, clearExtras }
}
