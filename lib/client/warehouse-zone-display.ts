type ZoneLike = {
  id: string
  name: string
  active?: boolean
}

type ZoneStockLineLike = {
  sku?: string
  totalQty?: number
}

type ZoneStocksLike = Record<string, ZoneStockLineLike[]>

function normalizeSku(sku: string): string {
  return String(sku ?? "").trim().toLowerCase()
}

export function getProductZoneIdsWithStock(input: {
  sku: string
  zoneStocks: ZoneStocksLike
  zones: ZoneLike[]
}): string[] {
  const skuKey = normalizeSku(input.sku)
  if (!skuKey) return []

  const activeZoneIds = new Set((input.zones ?? []).filter((z) => z.active !== false).map((z) => z.id))
  const zoneIds: string[] = []

  for (const [zoneId, lines] of Object.entries(input.zoneStocks ?? {})) {
    if (!activeZoneIds.has(zoneId)) continue
    if (!Array.isArray(lines)) continue

    const found = lines.find((line) => {
      const lineSku = normalizeSku(String(line?.sku ?? ""))
      const totalQty = Math.trunc(Number(line?.totalQty ?? 0))
      return lineSku === skuKey && totalQty > 0
    })

    if (found) zoneIds.push(zoneId)
  }

  return zoneIds.sort((a, b) => a.localeCompare(b, "id"))
}

export function getProductZoneDisplayLabel(input: {
  sku: string
  receivingDefaultWarehouseId?: string
  zoneStocks: ZoneStocksLike
  zones: ZoneLike[]
}): string {
  const zoneNameById = new Map<string, string>()
  for (const z of input.zones ?? []) {
    if (z.active === false) continue
    zoneNameById.set(z.id, z.name)
  }

  const stockedZoneIds = getProductZoneIdsWithStock({
    sku: input.sku,
    zoneStocks: input.zoneStocks,
    zones: input.zones,
  })

  if (stockedZoneIds.length <= 1) {
    const primary = String(input.receivingDefaultWarehouseId ?? "").trim() || stockedZoneIds[0] || ""
    if (!primary) return "-"
    return zoneNameById.get(primary) || primary
  }

  const names = stockedZoneIds
    .map((zoneId) => zoneNameById.get(zoneId) || zoneId)
    .filter(Boolean)

  const preview = names.slice(0, 2).join(", ")
  const extra = Math.max(0, names.length - 2)
  return extra > 0 ? `Multi Zona (${preview}, +${extra})` : `Multi Zona (${preview})`
}
