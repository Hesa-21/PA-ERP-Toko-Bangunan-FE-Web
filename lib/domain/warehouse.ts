export type WarehouseZoneDto = {
  id: string
  name: string
  status: "Aktif" | "Maintenance"
  active?: boolean
}

export type ZoneStockLineDto = {
  sku: string
  name?: string
  normalQty: number
  damagedQty: number
  expiredQty: number
  totalQty: number
}

export type ZoneStocksDto = Record<string, ZoneStockLineDto[]>

export type WarehouseZoneStatus = "Aktif" | "Maintenance"
export type StockMovementType = "Masuk" | "Keluar" | "Pindah"

export type WarehouseZone = {
  id: string
  name: string
  status: WarehouseZoneStatus
  // Soft-delete flag (default true when omitted).
  active?: boolean
}

export type WarehouseZoneLike = Pick<WarehouseZone, "id" | "name">

export type StockMovement = {
  id: string
  date: string
  time: string
  item: string
  type: StockMovementType
  quantity: number
  fromLocation: string
  toLocation: string
  operator: string

  // Origin metadata for system-generated movements (e.g. sales, purchase receipts, stock variance).
  sourceDocumentType?: string
  sourceDocumentId?: string

  // Optional metadata (e.g. from stock variance / adjustments)
  reason?: string
  note?: string

  status?: "POSTED" | "VOID"
  voidedAt?: string
  voidedBy?: string
  voidReason?: string
}

export type BranchWarehouseData = {
  zones: WarehouseZone[]
  movements: StockMovement[]
}

export function makeNewZoneId(existing: readonly WarehouseZone[], prefix: string): string {
  const used = new Set(existing.map((z) => z.id))
  for (let i = 1; i < 999; i += 1) {
    const id = `${prefix}${i}`
    if (!used.has(id)) return id
  }
  return `${prefix}${Date.now().toString(36)}`
}

export function makeNewMovementId(existing: readonly StockMovement[], prefix: string): string {
  const used = new Set(existing.map((m) => m.id))
  for (let i = 1; i < 9999; i += 1) {
    const id = `${prefix}${String(i).padStart(3, "0")}`
    if (!used.has(id)) return id
  }
  return `${prefix}${Date.now().toString(36)}`
}
