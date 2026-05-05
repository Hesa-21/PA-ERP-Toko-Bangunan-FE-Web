import { defaultIdFactory, type IdFactory } from "./ids"
import { err, ok, type Result } from "./result"
import type {
  DomainError,
  ISODateTimeString,
  PurchaseDocument,
  PurchasePaymentStatus,
  StockLedgerEntry,
} from "./types"

export type PurchaseStatusUi = "Draft" | "Received" | "Paid" | "Voided"

export function computePurchaseTotal(doc: PurchaseDocument): number {
  return (doc.items ?? []).reduce((sum, line) => {
    const qty = Math.max(0, Math.trunc(Number(line.quantity) || 0))
    const unitCost = Math.max(0, Number(line.unitCost) || 0)
    const discount = Math.max(0, Math.min(Number(line.discount) || 0, unitCost))
    return sum + Math.max(0, unitCost - discount) * qty
  }, 0)
}

export function getPurchaseStatusUi(doc: PurchaseDocument): PurchaseStatusUi {
  if (doc.status === "VOID") return "Voided"
  if (doc.status === "DRAFT") return "Draft"
  // POSTED
  return doc.paymentStatus === "tunai" ? "Paid" : "Received"
}

export function isPurchaseDueDateRequired(paymentStatus: PurchasePaymentStatus): boolean {
  return paymentStatus === "tempo"
}

type CreatePurchaseDraftInput = {
  branchId: string
  createdBy: string
  createdAt: ISODateTimeString
  supplierName?: string
  supplierPhone?: string
  supplierAddress?: string
  paymentStatus: PurchasePaymentStatus
  paidAmount?: number
  dueDate?: ISODateTimeString
  expectedDelivery?: ISODateTimeString
  warehouseId?: string
  note?: string
  items: Array<{
    sku: string
    quantity: number
    unitCost: number
    discount: number
    warehouseId?: string
  }>
}

export function createPurchaseDraft(
  input: CreatePurchaseDraftInput,
  deps?: { id?: IdFactory }
): Result<PurchaseDocument, DomainError> {
  const makeId = deps?.id ?? defaultIdFactory

  if (!input.branchId) return err({ code: "INVALID_INPUT", message: "branchId wajib." })
  if (!input.createdBy) return err({ code: "INVALID_INPUT", message: "createdBy wajib." })
  if (!input.createdAt) return err({ code: "INVALID_INPUT", message: "createdAt wajib." })
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return err({ code: "INVALID_INPUT", message: "Minimal 1 item pembelian." })
  }

  if (input.paymentStatus === "tempo") {
    const due = (input.dueDate ?? "").trim()
    if (!due) {
      return err({ code: "INVALID_INPUT", message: "dueDate wajib untuk pembelian tempo." })
    }
  }

  const items: PurchaseDocument["items"] = []
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

    const unitCost = Math.max(0, Number(i.unitCost) || 0)
    const discount = Math.max(0, Math.min(Number(i.discount) || 0, unitCost))

    items.push({
      id: makeId(),
      sku,
      quantity,
      receivedQty: 0,
      unitCost,
      discount,
      warehouseId: (i.warehouseId ?? "").trim() || undefined,
    })
  }

  const paidAmount =
    input.paidAmount !== undefined && Number.isFinite(Number(input.paidAmount))
      ? Math.max(0, Number(input.paidAmount) || 0)
      : undefined

  return ok({
    id: makeId(),
    branchId: input.branchId,
    status: "DRAFT",
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    warehouseId: (input.warehouseId ?? "").trim() || undefined,
    supplierName: (input.supplierName ?? "").trim() || undefined,
    supplierPhone: (input.supplierPhone ?? "").trim() || undefined,
    supplierAddress: (input.supplierAddress ?? "").trim() || undefined,
    paymentStatus: input.paymentStatus,
    paidAmount,
    dueDate: input.paymentStatus === "tempo" ? input.dueDate : undefined,
    expectedDelivery: (input.expectedDelivery ?? "").trim() || undefined,
    note: (input.note ?? "").trim() || undefined,
    items,
  })
}

type PostPurchaseReceiptInput = {
  doc: PurchaseDocument
  postedBy: string
  postedAt: ISODateTimeString
  warehouseIdByLineId?: Record<string, string>
  receiptItems?: Array<{ lineId?: string; sku?: string; quantity?: number }>
}

export function postPurchaseReceipt(
  input: PostPurchaseReceiptInput,
  deps?: { id?: IdFactory }
): Result<{ doc: PurchaseDocument; newEntries: StockLedgerEntry[] }, DomainError> {
  const makeId = deps?.id ?? defaultIdFactory

  if (input.doc.status === "VOID") {
    return err({
      code: "INVALID_STATUS_TRANSITION",
      message: "Dokumen VOID tidak bisa diterima.",
      details: { status: input.doc.status },
    })
  }
  if (!input.postedBy) return err({ code: "INVALID_INPUT", message: "postedBy wajib." })
  if (!input.postedAt) return err({ code: "INVALID_INPUT", message: "postedAt wajib." })
  const warehouseIdByLineId = input.warehouseIdByLineId ?? {}

  const lineById = new Map(input.doc.items.map((l) => [l.id, l]))
  const resolveLineWarehouseId = (lineId: string): string => {
    const line = lineById.get(lineId)
    const wid = String(
      (warehouseIdByLineId as Record<string, string | undefined>)[lineId] ??
        line?.warehouseId ??
        input.doc.warehouseId ??
        ""
    ).trim()
    return wid
  }

  const lineIdsBySku = new Map<string, string[]>()
  for (const l of input.doc.items) {
    const sku = (l.sku ?? "").trim()
    if (!sku) continue
    const arr = lineIdsBySku.get(sku) ?? []
    arr.push(l.id)
    lineIdsBySku.set(sku, arr)
  }

  const remainingByLineId = new Map<string, number>()
  for (const l of input.doc.items) {
    const ordered = Math.max(0, Math.trunc(Number(l.quantity) || 0))
    const received = Math.max(0, Math.trunc(Number(l.receivedQty) || 0))
    remainingByLineId.set(l.id, Math.max(0, ordered - received))
  }

  const requested = input.receiptItems ?? []
  const qtyToReceiveByLineId = new Map<string, number>()

  if (Array.isArray(requested) && requested.length > 0) {
    for (const r of requested) {
      const lineIdRaw = (r.lineId ?? "").trim()
      const skuRaw = (r.sku ?? "").trim()

      let lineId = lineIdRaw
      if (!lineId) {
        if (!skuRaw) return err({ code: "INVALID_INPUT", message: "Setiap item penerimaan harus punya lineId atau sku." })
        const ids = lineIdsBySku.get(skuRaw) ?? []
        if (ids.length === 0) return err({ code: "INVALID_INPUT", message: `SKU tidak ditemukan di dokumen: ${skuRaw}.` })
        if (ids.length > 1) {
          return err({
            code: "INVALID_INPUT",
            message: `SKU duplikat di dokumen (${skuRaw}). Gunakan lineId untuk menentukan baris.`,
          })
        }
        lineId = ids[0]
      }

      const line = lineById.get(lineId)
      if (!line) return err({ code: "INVALID_INPUT", message: `Line tidak ditemukan: ${lineId}.` })

      const qtyRaw = Number(r.quantity)
      const qty = Number.isFinite(qtyRaw) ? Math.trunc(qtyRaw) : NaN
      if (!Number.isFinite(qty) || qty <= 0) {
        return err({ code: "INVALID_INPUT", message: "quantity penerimaan harus angka bulat > 0." })
      }

      const remaining = remainingByLineId.get(lineId) ?? 0
      const prev = qtyToReceiveByLineId.get(lineId) ?? 0
      if (prev + qty > remaining) {
        const sku = (line.sku ?? "").trim()
        return err({
          code: "INVALID_INPUT",
          message: `Qty penerimaan melebihi sisa untuk ${sku || lineId}. Sisa ${remaining}, diminta ${prev + qty}.`,
          details: { lineId, sku, remaining, requested: prev + qty },
        })
      }
      qtyToReceiveByLineId.set(lineId, prev + qty)
    }
  } else {
    // Default: receive all remaining quantities.
    for (const l of input.doc.items) {
      const remaining = remainingByLineId.get(l.id) ?? 0
      if (remaining > 0) qtyToReceiveByLineId.set(l.id, remaining)
    }
  }

  const totalToReceive = Array.from(qtyToReceiveByLineId.values()).reduce((a, b) => a + b, 0)
  if (totalToReceive <= 0) {
    return err({
      code: "INVALID_STATUS_TRANSITION",
      message: "Tidak ada qty yang bisa diterima (semua item sudah lengkap).",
    })
  }

  // Ensure we have a target warehouse zone for every line we are receiving.
  for (const [lineId, qty] of qtyToReceiveByLineId.entries()) {
    if (!(qty > 0)) continue
    const wid = resolveLineWarehouseId(lineId)
    if (!wid) {
      return err({
        code: "INVALID_INPUT",
        message: "Zona tujuan belum bisa ditentukan untuk salah satu item. Pastikan setiap produk punya Zona tujuan default di Master Data.",
        details: { lineId },
      })
    }
  }

  const newEntries: StockLedgerEntry[] = []
  const nextItems: PurchaseDocument["items"] = input.doc.items.map((line) => {
    const addQty = qtyToReceiveByLineId.get(line.id) ?? 0
    if (addQty > 0) {
      const wid = resolveLineWarehouseId(line.id)
      newEntries.push({
        id: makeId(),
        branchId: input.doc.branchId,
        warehouseId: wid,
        sku: line.sku,
        qtyDelta: Math.abs(addQty),
        reason: "Purchase receipt",
        sourceDocumentType: "PURCHASE_RECEIPT",
        sourceDocumentId: input.doc.id,
        sourceLineId: line.id,
        createdAt: input.postedAt,
        createdBy: input.postedBy,
      })
    }
    return {
      ...line,
      receivedQty: Math.max(0, Math.trunc(Number(line.receivedQty) || 0)) + addQty,
      warehouseId: addQty > 0 ? resolveLineWarehouseId(line.id) || line.warehouseId : line.warehouseId,
    }
  })

  const warehouseIds = new Set(
    nextItems
      .map((l) => String(l.warehouseId ?? "").trim())
      .filter(Boolean)
  )
  const docWarehouseId = warehouseIds.size === 1 ? Array.from(warehouseIds)[0] : undefined

  return ok({
    doc: {
      ...input.doc,
      status: "POSTED",
      postedAt: input.postedAt,
      postedBy: input.postedBy,
      warehouseId: docWarehouseId,
      items: nextItems,
    },
    newEntries,
  })
}
