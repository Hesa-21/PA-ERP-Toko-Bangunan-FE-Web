import { ensureBranchState } from "@/lib/server/mock-db"
import { createSalesDraft } from "@/lib/domain"
import { computePosTotals, validatePosCheckout, type PosCartLine, type PosPaymentStatus } from "@/lib/domain/pos"
import type { PriceTier } from "@/lib/domain"

export type PosSaleLineInput = {
  sku: string
  quantity: number
  unitPrice: number
  discount: number
  priceTier: PriceTier
  warehouseId?: string
}

export type CreatePosSaleInput = {
  branch: string
  postedBy: string
  warehouseId?: string
  salespersonName: string
  paymentStatus: PosPaymentStatus
  paidAmount: number
  dueDate?: string
  orderDiscount: number
  customerName: string
  customerAddress: string
  customerPhone?: string
  items: PosSaleLineInput[]
}

function throwDomainInvalidInput(message: string): never {
  throw new Error(`DOMAIN:INVALID_INPUT:${message}`)
}

function normalizeNonNegativeMoney(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n))
}

function normalizeTempoDueDateIso(input: { paymentStatus: PosPaymentStatus; dueDate?: string }): string | undefined {
  if (input.paymentStatus !== "tempo") return undefined

  const dueDate = String(input.dueDate ?? "").trim()
  if (!dueDate) {
    throwDomainInvalidInput("Jatuh tempo wajib diisi untuk transaksi tempo.")
  }

  const parsed = new Date(dueDate)
  if (Number.isNaN(parsed.getTime())) {
    throwDomainInvalidInput("Jatuh tempo wajib diisi untuk transaksi tempo.")
  }

  return parsed.toISOString()
}

export function validateCreatePosSaleInput(input: CreatePosSaleInput) {
  if (!String(input.branch ?? "").trim()) {
    return { ok: false as const, error: "branch wajib." }
  }

  if (!String(input.postedBy ?? "").trim()) {
    return { ok: false as const, error: "postedBy wajib." }
  }

  const lines: PosCartLine[] = input.items.map((i) => ({
    sku: i.sku,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    discount: i.discount,
    priceTier: i.priceTier,
  }))

  const validation = validatePosCheckout({
    warehouseId: input.warehouseId,
    items: lines,
    salespersonName: input.salespersonName,
    customerName: input.customerName,
    customerAddress: input.customerAddress,
    customerPhone: input.customerPhone,
    paymentStatus: input.paymentStatus,
    dueDate: input.paymentStatus === "tempo" ? input.dueDate : undefined,
  })

  if (!validation.ok) {
    return { ok: false as const, error: validation.error.message }
  }

  return { ok: true as const }
}

export function createPosSale(input: CreatePosSaleInput) {
  const validation = validateCreatePosSaleInput(input)
  if (!validation.ok) {
    throwDomainInvalidInput(validation.error)
  }

  const paidAmount = normalizeNonNegativeMoney(input.paidAmount)
  const dueDateIso = normalizeTempoDueDateIso({
    paymentStatus: input.paymentStatus,
    dueDate: input.dueDate,
  })
  const orderDiscount = normalizeNonNegativeMoney(input.orderDiscount)

  const normalizedItems = input.items.map((i) => ({
    sku: String(i.sku ?? "").trim(),
    quantity: Number(i.quantity ?? 0),
    unitPrice: Number(i.unitPrice ?? 0),
    discount: Number(i.discount ?? 0),
    priceTier: i.priceTier,
    warehouseId: String(i.warehouseId ?? "").trim() || undefined,
  }))

  const draftRes = createSalesDraft({
    branchId: String(input.branch ?? "").trim(),
    createdAt: new Date().toISOString(),
    createdBy: String(input.postedBy ?? "").trim(),
    salespersonName: String(input.salespersonName ?? "").trim(),
    paymentStatus: input.paymentStatus,
    paidAmount,
    dueDate: dueDateIso,
    orderDiscount,
    customerName: String(input.customerName ?? "").trim(),
    customerAddress: String(input.customerAddress ?? "").trim(),
    customerPhone: String(input.customerPhone ?? "").trim() || undefined,
    items: normalizedItems,
  })

  if (!draftRes.ok) {
    const e = draftRes.error
    throw new Error(`DOMAIN:${e.code}:${e.message}`)
  }

  const state = ensureBranchState(String(input.branch ?? "").trim())
  // TODO: Delegate stock deduction to Express API.
  state.sales.unshift(draftRes.value)

  const computed = computePosTotals({
    items: draftRes.value.items.map((line) => ({
      sku: line.sku,
      name: undefined,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      priceTier: line.priceTier,
    })),
    orderDiscount: draftRes.value.orderDiscount,
  })

  return { doc: draftRes.value, newEntries: [], computed }
}
