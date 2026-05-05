import { defaultIdFactory, type IdFactory } from "./ids"
import { err, ok, type Result } from "./result"
import { getOnHandQty } from "./stock-ledger"
import type { WarehouseZoneLike } from "./warehouse"
import { toIsoDateOnlyString } from "@/lib/utils/date"
import type {
  DomainError,
  ISODateTimeString,
  ReturnCondition,
  ReturnDocument,
  ReturnType,
  StockLedgerEntry,
  ReturnSourceDocumentType,
} from "./types"

export type ReturnRowTypeUi = "Customer Return" | "Supplier Return"
export type ReturnRowConditionUi = "Good" | "Damaged" | "Expired"
export type ReturnRowStatusUi = "Pending" | "Rejected" | "Completed"

export type ReturnRow = {
  id: string
  date: string
  type: ReturnRowTypeUi
  originalInvoice: string
  customer: string
  item: string
  quantity: number
  reason: string
  condition: ReturnRowConditionUi
  refundAmount: number
  status: ReturnRowStatusUi
  processor: string
  warehouseId?: string
}

export function getReturnTypeLabel(type: ReturnRowTypeUi): string {
  return type === "Customer Return" ? "Retur Pelanggan" : "Retur Supplier"
}

export function getReturnConditionLabel(condition: ReturnRowConditionUi): string {
  if (condition === "Good") return "Baik"
  if (condition === "Damaged") return "Rusak"
  if (condition === "Expired") return "Kadaluarsa"
  return condition
}

export function getReturnStatusLabel(status: ReturnRowStatusUi): string {
  if (status === "Pending") return "Menunggu"
  if (status === "Completed") return "Selesai"
  if (status === "Rejected") return "Dibatalkan"
  return status
}

export function computeReturnRefund(doc: ReturnDocument): number {
  return (doc.items ?? []).reduce((sum, line) => {
    const qty = Math.max(0, Math.trunc(Number(line.quantity) || 0))
    const unit = Math.max(0, Number(line.unitRefund) || 0)
    return sum + unit * qty
  }, 0)
}

export function mapReturnDocumentToRow(doc: ReturnDocument): ReturnRow {
  const totalQty = (doc.items ?? []).reduce((sum, it) => sum + Math.max(0, Math.trunc(Number(it.quantity) || 0)), 0)
  const firstSku = doc.items?.[0]?.sku ?? "-"
  const itemLabel = (doc.items?.length ?? 0) <= 1 ? firstSku : `${firstSku} (+${doc.items.length - 1})`
  const firstReason = doc.items?.[0]?.reason ?? "-"

  const condition: ReturnRowConditionUi =
    doc.condition === "GOOD" ? "Good" : doc.condition === "DAMAGED" ? "Damaged" : "Expired"

  const status: ReturnRowStatusUi = doc.status === "POSTED" ? "Completed" : doc.status === "VOID" ? "Rejected" : "Pending"

  return {
    id: doc.id,
    date: toIsoDateOnlyString(doc.createdAt),
    type: doc.type === "CUSTOMER" ? "Customer Return" : "Supplier Return",
    originalInvoice: doc.originalSalesId || "-",
    customer: doc.customerOrSupplierName || "-",
    item: itemLabel,
    quantity: totalQty,
    reason: firstReason,
    condition,
    refundAmount: computeReturnRefund(doc),
    status,
    processor: doc.postedBy || doc.createdBy,
    warehouseId: doc.warehouseId,
  }
}

export function resolveReturnZoneLabel(input: {
  zones: WarehouseZoneLike[]
  warehouseId?: string
}): string {
  const { zones, warehouseId } = input
  const raw = (warehouseId ?? "").trim()
  if (!raw) return "-"

  const idx = raw.lastIndexOf("::")
  if (idx > 0) {
    const base = raw.slice(0, idx)
    const cond = raw.slice(idx + 2)
    const baseName = zones.find((z) => z.id === base)?.name ?? base
    const condLabel = cond === "DAMAGED" ? "Rusak" : cond === "EXPIRED" ? "Kadaluarsa" : cond
    return `${baseName} (${condLabel})`
  }

  return zones.find((z) => z.id === raw)?.name ?? raw
}

export function isValidReturnBaseZoneId(warehouseId: string | undefined): boolean {
  const raw = (warehouseId ?? "").trim()
  if (!raw) return false
  if (raw === "Receiving" || raw === "Staging") return false
  if (raw.includes("::")) return false
  return true
}

type CreateReturnDraftInput = {
  branchId: string
  createdBy: string
  createdAt: ISODateTimeString
  type: ReturnType
  condition: ReturnCondition
  customerOrSupplierName?: string
  originalSalesId?: string
  sourceDocumentType?: ReturnSourceDocumentType
  sourceDocumentId?: string
  note?: string
  warehouseId?: string
  items: Array<{
    sku: string
    quantity: number
    unitRefund: number
    reason: string
    sourceLineId?: string
  }>
}

export function createReturnDraft(
  input: CreateReturnDraftInput,
  deps?: { id?: IdFactory }
): Result<ReturnDocument, DomainError> {
  const makeId = deps?.id ?? defaultIdFactory

  if (!input.branchId) return err({ code: "INVALID_INPUT", message: "branchId wajib." })
  if (!input.createdBy) return err({ code: "INVALID_INPUT", message: "createdBy wajib." })
  if (!input.createdAt) return err({ code: "INVALID_INPUT", message: "createdAt wajib." })
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return err({ code: "INVALID_INPUT", message: "Minimal 1 item retur." })
  }

  const warehouseId = (input.warehouseId ?? "").trim()
  if (!warehouseId) {
    return err({ code: "INVALID_INPUT", message: "warehouseId wajib." })
  }
  if (warehouseId === "Receiving" || warehouseId === "Staging") {
    return err({
      code: "INVALID_INPUT",
      message: "warehouseId harus zona gudang (bukan Receiving/Staging).",
      details: { warehouseId },
    })
  }
  if (warehouseId.includes("::")) {
    return err({
      code: "INVALID_INPUT",
      message: "warehouseId harus zona gudang (bukan sub-lokasi kondisi).",
      details: { warehouseId },
    })
  }

  const items: ReturnDocument["items"] = []
  for (const i of input.items) {
    const sku = (i.sku ?? "").trim()
    if (!sku) return err({ code: "INVALID_INPUT", message: "SKU wajib di setiap item." })

    const quantityRaw = Number(i.quantity)
    const quantity = Number.isFinite(quantityRaw) ? Math.trunc(quantityRaw) : NaN
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return err({
        code: "INVALID_INPUT",
        message: "quantity harus angka bulat > 0.",
        details: { sku, quantity: i.quantity },
      })
    }

    const unitRefund = Math.max(0, Number(i.unitRefund) || 0)
    const reason = (i.reason ?? "").trim()
    if (!reason) {
      return err({ code: "INVALID_INPUT", message: "reason wajib di setiap item.", details: { sku } })
    }

    items.push({
      id: makeId(),
      sku,
      quantity,
      unitRefund,
      reason,
      sourceLineId: (i.sourceLineId ?? "").trim() || undefined,
    })
  }

  return ok({
    id: makeId(),
    branchId: input.branchId,
    status: "DRAFT",
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    type: input.type,
    condition: input.condition,
    customerOrSupplierName: (input.customerOrSupplierName ?? "").trim() || undefined,
    originalSalesId: (input.originalSalesId ?? "").trim() || undefined,
    sourceDocumentType: input.sourceDocumentType,
    sourceDocumentId: (input.sourceDocumentId ?? "").trim() || undefined,
    note: (input.note ?? "").trim() || undefined,
    warehouseId,
    items,
  })
}

type PostReturnInput = {
  doc: ReturnDocument
  ledger: readonly StockLedgerEntry[]
  postedBy: string
  postedAt: ISODateTimeString
  warehouseId: string
  allowNegativeStock?: boolean
}

export function postReturn(
  input: PostReturnInput,
  deps?: { id?: IdFactory }
): Result<{ doc: ReturnDocument; newEntries: StockLedgerEntry[] }, DomainError> {
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

  const warehouseId = (input.warehouseId ?? "").trim()
  if (!warehouseId) return err({ code: "INVALID_INPUT", message: "warehouseId wajib." })
  if (warehouseId === "Receiving" || warehouseId === "Staging") {
    return err({
      code: "INVALID_INPUT",
      message: "warehouseId harus zona gudang (bukan Receiving/Staging).",
      details: { warehouseId },
    })
  }

  const allowNegativeStock = input.allowNegativeStock ?? false

  // Supplier return reduces stock.
  if (input.doc.type === "SUPPLIER") {
    if (!allowNegativeStock) {
      const needBySku = new Map<string, number>()
      for (const line of input.doc.items) {
        needBySku.set(line.sku, (needBySku.get(line.sku) ?? 0) + line.quantity)
      }

      for (const [sku, needed] of needBySku.entries()) {
        const onHand = getOnHandQty(input.ledger, {
          branchId: input.doc.branchId,
          sku,
          warehouseId,
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
  }

  // Policy:
  // - CUSTOMER => always adds stock to the provided zone
  // - SUPPLIER => removes stock from the selected zone
  const newEntries: StockLedgerEntry[] = []

  for (const line of input.doc.items) {
    if (input.doc.type === "CUSTOMER") {
      const label = input.doc.condition === "GOOD" ? "GOOD" : input.doc.condition === "DAMAGED" ? "DAMAGED" : "EXPIRED"
      newEntries.push({
        id: makeId(),
        branchId: input.doc.branchId,
        warehouseId,
        sku: line.sku,
        qtyDelta: Math.abs(line.quantity),
        reason: `Customer return (${label})`,
        sourceDocumentType: "RETURN",
        sourceDocumentId: input.doc.id,
        sourceLineId: line.id,
        createdAt: input.postedAt,
        createdBy: input.postedBy,
      })
      continue
    }

    newEntries.push({
      id: makeId(),
      branchId: input.doc.branchId,
      warehouseId,
      sku: line.sku,
      qtyDelta: -Math.abs(line.quantity),
      reason: "Supplier return",
      sourceDocumentType: "RETURN",
      sourceDocumentId: input.doc.id,
      sourceLineId: line.id,
      createdAt: input.postedAt,
      createdBy: input.postedBy,
    })
  }

  return ok({
    doc: {
      ...input.doc,
      status: "POSTED",
      postedAt: input.postedAt,
      postedBy: input.postedBy,
      warehouseId,
    },
    newEntries,
  })
}
