import { defaultIdFactory, type IdFactory } from "./ids"
import { err, ok, type Result } from "./result"
import { getOnHandQty } from "./stock-ledger"
import type {
  DomainError,
  ISODateTimeString,
  SalesDocument,
  StockLedgerEntry,
  PriceTier,
} from "./types"

export type SalesPaymentStatus = "tunai" | "tempo"

export function normalizeSalesPayment(input: {
  total: number
  paidAmountInput?: number
}): { paidAmount: number; remaining: number } {
  const total = Math.max(0, Number(input.total) || 0)
  const raw = Number(input.paidAmountInput ?? 0)
  const paidAmount = Number.isFinite(raw) ? Math.min(Math.max(0, raw), total) : 0
  const remaining = Math.max(0, total - paidAmount)
  return { paidAmount, remaining }
}

export function isSalesDueDateRequired(input: {
  paymentStatus: SalesPaymentStatus
  remaining: number
}): boolean {
  if (input.paymentStatus !== "tempo") return false
  return Math.max(0, Number(input.remaining) || 0) > 0
}

export function computeSalesTotal(doc: Pick<SalesDocument, "items" | "orderDiscount">): number {
  const subtotal = (doc.items ?? []).reduce((sum, line) => {
    const unitNet = Math.max(0, (Number(line.unitPrice) || 0) - (Number(line.discount) || 0))
    const qty = Math.max(0, Math.trunc(Number(line.quantity) || 0))
    return sum + unitNet * qty
  }, 0)

  const afterOrderDiscount = Math.max(0, subtotal - Math.max(0, Number(doc.orderDiscount) || 0))
  return Math.round(afterOrderDiscount)
}

type CreateSalesDraftInput = {
  branchId: string
  createdBy: string
  createdAt: ISODateTimeString
  salespersonName?: string
  paymentStatus: "tunai" | "tempo"
  paidAmount?: number
  dueDate?: ISODateTimeString
  orderDiscount: number
  customerName?: string
  customerAddress?: string
  customerPhone?: string
  items: Array<{
    sku: string
    quantity: number
    unitPrice: number
    discount: number
    priceTier: PriceTier
    warehouseId?: string
  }>
}

export function createSalesDraft(
  input: CreateSalesDraftInput,
  deps?: { id?: IdFactory }
): Result<SalesDocument, DomainError> {
  const makeId = deps?.id ?? defaultIdFactory

  if (!input.branchId) return err({ code: "INVALID_INPUT", message: "branchId wajib." })
  if (!input.createdBy) return err({ code: "INVALID_INPUT", message: "createdBy wajib." })
  if (!input.createdAt) return err({ code: "INVALID_INPUT", message: "createdAt wajib." })
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return err({ code: "INVALID_INPUT", message: "Minimal 1 item penjualan." })
  }

  const items: SalesDocument["items"] = []
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

    const unitPrice = Math.max(0, Number(i.unitPrice) || 0)
    const discount = Math.max(0, Math.min(Number(i.discount) || 0, unitPrice))

    const warehouseId = String(i.warehouseId ?? "").trim() || undefined

    items.push({
      id: makeId(),
      sku,
      quantity,
      unitPrice,
      discount,
      priceTier: i.priceTier,
      warehouseId,
    })
  }

  return ok({
    id: makeId(),
    branchId: input.branchId,
    status: "DRAFT",
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    salespersonName: (input.salespersonName ?? "").trim() || undefined,
    customerName: (input.customerName ?? "").trim() || undefined,
    customerAddress: (input.customerAddress ?? "").trim() || undefined,
    customerPhone: (input.customerPhone ?? "").trim() || undefined,
    paymentStatus: input.paymentStatus,
    paidAmount: Number.isFinite(input.paidAmount) ? Math.max(0, Number(input.paidAmount) || 0) : undefined,
    dueDate: input.dueDate,
    orderDiscount: Math.max(0, Number(input.orderDiscount) || 0),
    items,
  })
}

type PostSalesInput = {
  doc: SalesDocument
  ledger: readonly StockLedgerEntry[]
  postedBy: string
  postedAt: ISODateTimeString
  warehouseId?: string
  allowNegativeStock?: boolean
}

export function postSales(
  input: PostSalesInput,
  deps?: { id?: IdFactory }
): Result<{ doc: SalesDocument; newEntries: StockLedgerEntry[] }, DomainError> {
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
  if (input.doc.items.length === 0) {
    return err({ code: "INVALID_INPUT", message: "Tidak ada item penjualan." })
  }

  const allowNegativeStock = input.allowNegativeStock ?? false

  // Aggregate required qty per (warehouseId, sku)
  const requiredByWarehouseSku = new Map<string, { warehouseId?: string; sku: string; needed: number }>()
  for (const item of input.doc.items) {
    const warehouseId = (item.warehouseId ?? input.warehouseId) || undefined
    const key = `${warehouseId ?? ""}::${item.sku}`
    const existing = requiredByWarehouseSku.get(key)
    if (existing) {
      existing.needed += item.quantity
    } else {
      requiredByWarehouseSku.set(key, { warehouseId, sku: item.sku, needed: item.quantity })
    }
  }

  if (!allowNegativeStock) {
    for (const req of requiredByWarehouseSku.values()) {
      const onHand = getOnHandQty(input.ledger, {
        branchId: input.doc.branchId,
        sku: req.sku,
        warehouseId: req.warehouseId,
      })
      if (onHand < req.needed) {
        return err({
          code: "INSUFFICIENT_STOCK",
          message: `Stok tidak cukup untuk SKU ${req.sku}.`,
          details: { sku: req.sku, onHand, needed: req.needed, warehouseId: req.warehouseId },
        })
      }
    }
  }

  const newEntries: StockLedgerEntry[] = input.doc.items.map((item) => {
    const warehouseId = (item.warehouseId ?? input.warehouseId) || undefined
    return {
      id: makeId(),
      branchId: input.doc.branchId,
      warehouseId,
      sku: item.sku,
      qtyDelta: -Math.abs(item.quantity),
      reason: "Sales",
      sourceDocumentType: "SALES",
      sourceDocumentId: input.doc.id,
      sourceLineId: item.id,
      createdAt: input.postedAt,
      createdBy: input.postedBy,
    }
  })

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
