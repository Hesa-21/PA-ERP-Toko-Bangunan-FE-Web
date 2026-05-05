import type { StockLedgerEntry } from "./types"

export function getOnHandQty(
  ledger: readonly StockLedgerEntry[],
  params: { branchId: string; sku: string; warehouseId?: string }
): number {
  let qty = 0
  for (const entry of ledger) {
    if (entry.branchId !== params.branchId) continue
    if (params.warehouseId && entry.warehouseId !== params.warehouseId) continue
    if (entry.sku !== params.sku) continue
    qty += entry.qtyDelta
  }
  return qty
}

export function appendLedger(
  ledger: readonly StockLedgerEntry[],
  entries: readonly StockLedgerEntry[]
): StockLedgerEntry[] {
  if (entries.length === 0) return [...ledger]
  return [...ledger, ...entries]
}
