import { defaultIdFactory, type IdFactory } from "./ids"
import { err, ok, type Result } from "./result"
import { getOnHandQty } from "./stock-ledger"
import type {
  DomainError,
  ISODateTimeString,
  StockAdjustmentDocument,
  StockAdjustmentLine,
  StockLedgerEntry,
} from "./types"

type CreateStockAdjustmentDraftInput = {
  branchId: string
  createdBy: string
  createdAt: ISODateTimeString
  note?: string
  lines: Array<{
    sku: string
    qtyDelta: number
    reason: string
    note?: string
  }>
}

export function createStockAdjustmentDraft(
  input: CreateStockAdjustmentDraftInput,
  deps?: { id?: IdFactory }
): Result<StockAdjustmentDocument, DomainError> {
  const makeId = deps?.id ?? defaultIdFactory

  if (!input.branchId) return err({ code: "INVALID_INPUT", message: "branchId wajib." })
  if (!input.createdBy) return err({ code: "INVALID_INPUT", message: "createdBy wajib." })
  if (!input.createdAt) return err({ code: "INVALID_INPUT", message: "createdAt wajib." })
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return err({ code: "INVALID_INPUT", message: "Minimal 1 baris penyesuaian stok." })
  }

  const lines: StockAdjustmentLine[] = []
  for (const line of input.lines) {
    const sku = (line.sku ?? "").trim()
    if (!sku) return err({ code: "INVALID_INPUT", message: "SKU wajib di setiap baris." })
    if (!Number.isFinite(line.qtyDelta) || line.qtyDelta === 0) {
      return err({
        code: "INVALID_INPUT",
        message: "qtyDelta harus angka dan tidak boleh 0.",
        details: { sku },
      })
    }
    if (!line.reason?.trim()) {
      return err({
        code: "INVALID_INPUT",
        message: "reason wajib di setiap baris.",
        details: { sku },
      })
    }

    lines.push({
      id: makeId(),
      sku,
      qtyDelta: Math.trunc(line.qtyDelta),
      reason: line.reason.trim(),
      note: line.note?.trim() || undefined,
    })
  }

  return ok({
    id: makeId(),
    branchId: input.branchId,
    status: "DRAFT",
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    note: input.note?.trim() || undefined,
    lines,
  })
}

type PostStockAdjustmentInput = {
  doc: StockAdjustmentDocument
  ledger: readonly StockLedgerEntry[]
  postedBy: string
  postedAt: ISODateTimeString
  warehouseId?: string
  allowNegativeStock?: boolean
}

export function postStockAdjustment(
  input: PostStockAdjustmentInput,
  deps?: { id?: IdFactory }
): Result<{ doc: StockAdjustmentDocument; newEntries: StockLedgerEntry[] }, DomainError> {
  const makeId = deps?.id ?? defaultIdFactory

  if (input.doc.status !== "DRAFT") {
    return err({
      code: "INVALID_STATUS_TRANSITION",
      message: "Hanya dokumen DRAFT yang bisa diposting.",
      details: { status: input.doc.status },
    })
  }
  if (!input.postedBy) return err({ code: "INVALID_INPUT", message: "postedBy wajib." })
  if (!input.postedAt) return err({ code: "INVALID_INPUT", message: "postedAt wajib." })

  const allowNegativeStock = input.allowNegativeStock ?? false

  // Validate stock sufficiency using aggregated deltas per sku (only for negative deltas)
  const needBySku = new Map<string, number>()
  for (const line of input.doc.lines) {
    if (line.qtyDelta >= 0) continue
    needBySku.set(line.sku, (needBySku.get(line.sku) ?? 0) + Math.abs(line.qtyDelta))
  }

  if (!allowNegativeStock) {
    for (const [sku, needed] of needBySku.entries()) {
      const onHand = getOnHandQty(input.ledger, {
        branchId: input.doc.branchId,
        sku,
        warehouseId: input.warehouseId,
      })
      if (onHand < needed) {
        return err({
          code: "INSUFFICIENT_STOCK",
          message: `Stok tidak cukup untuk SKU ${sku}.`,
          details: { sku, onHand, needed },
        })
      }
    }
  }

  const newEntries: StockLedgerEntry[] = input.doc.lines.map((line) => ({
    id: makeId(),
    branchId: input.doc.branchId,
    warehouseId: input.warehouseId,
    sku: line.sku,
    qtyDelta: line.qtyDelta,
    reason: line.reason,
    sourceDocumentType: "STOCK_ADJUSTMENT",
    sourceDocumentId: input.doc.id,
    sourceLineId: line.id,
    createdAt: input.postedAt,
    createdBy: input.postedBy,
  }))

  return ok({
    doc: {
      ...input.doc,
      status: "POSTED",
      postedAt: input.postedAt,
      postedBy: input.postedBy,
    },
    newEntries,
  })
}
