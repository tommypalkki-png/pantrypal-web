import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CustomRecipeInput } from '@/lib/recipes'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (recipe: Omit<CustomRecipeInput, 'id'>) => void
}

export function RecipeFormDialog({ open, onOpenChange, onSave }: Props) {
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [url, setUrl] = useState('')

  // Reset whenever the dialog opens
  useEffect(() => {
    if (!open) return
    setName('')
    setIngredients('')
    setInstructions('')
    setUrl('')
  }, [open])

  const trimmed = name.trim()
  const ingredientLines = ingredients.split('\n').map(l => l.trim()).filter(Boolean)
  const canSave = trimmed.length > 0 && ingredientLines.length > 0

  const save = () => {
    if (!canSave) return
    onSave({
      name: trimmed,
      ingredientLines,
      instructions: instructions.trim(),
      url: url.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add My Recipe</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="recipe-name">Name</Label>
            <Input
              id="recipe-name"
              placeholder="e.g. Grandma's lasagne"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recipe-ingredients">Ingredients — one per line</Label>
            <Textarea
              id="recipe-ingredients"
              placeholder={'500g spaghetti\n2 eggs\n100g parmesan\nBlack pepper'}
              value={ingredients}
              onChange={e => setIngredients(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-stone-400">
              Amounts are optional — they're used for display; matching uses the ingredient names.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recipe-instructions">Method (optional)</Label>
            <Textarea
              id="recipe-instructions"
              placeholder="How to cook it…"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recipe-url">Link (optional)</Label>
            <Input
              id="recipe-url"
              type="url"
              placeholder="https://…"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>
        </div>

        <Button type="button" className="w-full" disabled={!canSave} onClick={save}>
          Save recipe
        </Button>
      </DialogContent>
    </Dialog>
  )
}
