// Open Food Facts lookup — free, no API key.
// https://openfoodfacts.github.io/openfoodfacts-server/api/

export interface ProductInfo {
  name: string | null
  brand: string | null
  /** parsed from OFF "quantity" field, e.g. "500 g" -> { quantity: 500, unit: 'g' } */
  quantity: number | null
  unit: string | null
}

/** EAN-8/13, UPC-A/12, EAN-14 etc. — all-digit codes of plausible length. */
export function looksLikeBarcode(text: string): boolean {
  return /^\d{8,14}$/.test(text.trim())
}

export async function lookupProduct(barcode: string): Promise<ProductInfo | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
      `?fields=product_name,brands,quantity`
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 1 || !json.product) return null

    const p = json.product as {
      product_name?: string
      brands?: string
      quantity?: string
    }
    const parsed = parseQuantity(p.quantity)
    return {
      name: p.product_name?.trim() || null,
      brand: p.brands?.split(',')[0]?.trim() || null,
      quantity: parsed?.quantity ?? null,
      unit: parsed?.unit ?? null,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Parse strings like "500 g", "1.5 L", "750 ml", "6 x 33 cl" into our unit list. */
function parseQuantity(raw?: string): { quantity: number; unit: string } | null {
  if (!raw) return null
  const m = raw.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kg|g|cl|ml|l)\b/i)
  if (!m) return null
  let qty = parseFloat(m[1])
  let unit = m[2].toLowerCase()
  if (unit === 'l') unit = 'L'
  if (unit === 'cl') { qty = qty * 10; unit = 'ml' }
  if (qty <= 0) return null
  return { quantity: Math.round(qty * 100) / 100, unit }
}
