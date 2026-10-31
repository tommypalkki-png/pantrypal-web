import { useEffect, useState } from 'react'
import { newId } from '@/types/inventory'

/** A recipe the user typed in themselves. */
export interface CustomRecipe {
  id: string
  name: string
  /** one ingredient per line, as typed */
  ingredientLines: string[]
  instructions: string
  /** optional link to the source */
  url?: string
  createdAt: number
}

const KEY = 'pantrypal-custom-recipes-v1'

function load(): CustomRecipe[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as CustomRecipe[]
  } catch {
    // corrupted storage — start empty
  }
  return []
}

export function useCustomRecipes() {
  const [customRecipes, setCustomRecipes] = useState<CustomRecipe[]>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(customRecipes))
  }, [customRecipes])

  const addRecipe = (r: Omit<CustomRecipe, 'id' | 'createdAt'>) =>
    setCustomRecipes(prev => [...prev, { ...r, id: newId(), createdAt: Date.now() }])

  const deleteRecipe = (id: string) =>
    setCustomRecipes(prev => prev.filter(r => r.id !== id))

  return { customRecipes, addRecipe, deleteRecipe }
}
