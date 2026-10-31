import { useEffect, useState } from 'react'
import type { Location } from '@/types/inventory'
import { DEFAULT_LOCATIONS, LOCATION_COLORS, newId } from '@/types/inventory'

const KEY = 'pantrypal-locations-v1'

function load(): Location[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Location[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_LOCATIONS
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(locations))
  }, [locations])

  const addLocation = (name: string, emoji: string, colorIndex: number): Location => {
    const loc: Location = {
      id: 'loc-' + newId(),
      name: name.trim(),
      emoji,
      colorIndex: colorIndex % LOCATION_COLORS.length,
    }
    setLocations(prev => [...prev, loc])
    return loc
  }

  const renameLocation = (id: string, name: string) =>
    setLocations(prev => prev.map(l => (l.id === id ? { ...l, name: name.trim() } : l)))

  const deleteLocation = (id: string) =>
    setLocations(prev => (prev.length > 1 ? prev.filter(l => l.id !== id) : prev))

  return { locations, addLocation, renameLocation, deleteLocation }
}
