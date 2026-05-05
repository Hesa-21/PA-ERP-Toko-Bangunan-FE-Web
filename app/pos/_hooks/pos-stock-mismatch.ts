import type { PosProductDto, PosWarehouseZoneStockSummaryDto } from "@/app/pos/_api-clients/pos"

export type PosCartStockItem = {
  sku: string
  quantity: number
  name?: string
  receivingDefaultWarehouseId?: string
}

export type PosStockMismatch<TItem extends PosCartStockItem = PosCartStockItem> = {
  item: TItem
  product: PosProductDto | undefined
  available: number
  sourceZoneId: string
}

const toSkuKey = (value: string | undefined) => String(value ?? "").trim().toLowerCase()

const getNormalQtyInZoneFromSnapshot = (input: {
  zoneStocks: PosWarehouseZoneStockSummaryDto
  sku: string
  zoneId: string
}) => {
  const skuKey = toSkuKey(input.sku)
  const zoneId = String(input.zoneId ?? "").trim()
  if (!skuKey || !zoneId) return 0

  const lines = input.zoneStocks?.[zoneId]
  if (!Array.isArray(lines)) return 0

  const line = lines.find((entry) => toSkuKey((entry as { sku?: string }).sku) === skuKey)
  const qty = Number((line as { normalQty?: number } | undefined)?.normalQty ?? 0)
  return Math.max(0, Math.trunc(Number.isFinite(qty) ? qty : 0))
}

export function computePosStockMismatches<TItem extends PosCartStockItem>(input: {
  cart: TItem[]
  products: PosProductDto[]
  zoneStocks: PosWarehouseZoneStockSummaryDto
}): PosStockMismatch<TItem>[] {
  const productsBySku: Record<string, PosProductDto> = {}
  for (const product of input.products ?? []) {
    const key = toSkuKey(product.sku)
    if (!key) continue
    productsBySku[key] = product
  }

  return (input.cart ?? [])
    .map((item) => {
      const key = toSkuKey(item.sku)
      const product = productsBySku[key]
      const sourceZoneId = String(item.receivingDefaultWarehouseId ?? "").trim()
      const available = sourceZoneId
        ? getNormalQtyInZoneFromSnapshot({
            zoneStocks: input.zoneStocks,
            sku: item.sku,
            zoneId: sourceZoneId,
          })
        : Math.max(0, Math.trunc(Number(product?.stock ?? 0)))

      return {
        item,
        product,
        available,
        sourceZoneId,
      }
    })
    .filter((entry) => entry.item.quantity > entry.available)
}
