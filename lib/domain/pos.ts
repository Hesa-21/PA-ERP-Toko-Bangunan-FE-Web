import { err, ok, type Result } from "./result"
import type { Money, PriceTier } from "./types"

export type PosPaymentStatus = "tunai" | "tempo"

export type PosCartLine = {
  sku: string
  name?: string
  quantity: number
  unitPrice: Money
  discount: Money
  priceTier: PriceTier
}

export type PosTotals = {
  subtotal: Money
  perItemDiscountTotal: Money
  subtotalAfterItemDiscount: Money
  orderDiscountApplied: Money
  grandTotal: Money
}

export function clampDiscount(unitPrice: Money, discount: Money): Money {
  const price = Math.max(0, Number(unitPrice) || 0)
  const disc = Math.max(0, Number(discount) || 0)
  return Math.min(disc, price)
}

export function computePosTotals(input: {
  items: readonly PosCartLine[]
  orderDiscount: Money
}): PosTotals {
  const items = Array.isArray(input.items) ? input.items : []

  const subtotal = items.reduce((sum, item) => {
    const qty = Math.max(0, Math.trunc(Number(item.quantity) || 0))
    const unit = Math.max(0, Number(item.unitPrice) || 0)
    return sum + unit * qty
  }, 0)

  const perItemDiscountTotal = items.reduce((sum, item) => {
    const qty = Math.max(0, Math.trunc(Number(item.quantity) || 0))
    const unit = Math.max(0, Number(item.unitPrice) || 0)
    const disc = clampDiscount(unit, Number(item.discount) || 0)
    return sum + disc * qty
  }, 0)

  const subtotalAfterItemDiscount = items.reduce((sum, item) => {
    const qty = Math.max(0, Math.trunc(Number(item.quantity) || 0))
    const unit = Math.max(0, Number(item.unitPrice) || 0)
    const disc = clampDiscount(unit, Number(item.discount) || 0)
    return sum + Math.max(unit - disc, 0) * qty
  }, 0)

  const orderDiscountApplied = Math.max(
    0,
    Math.min(Math.max(0, Number(input.orderDiscount) || 0), subtotalAfterItemDiscount)
  )

  const grandTotal = Math.round(Math.max(subtotalAfterItemDiscount - orderDiscountApplied, 0))

  return {
    subtotal,
    perItemDiscountTotal,
    subtotalAfterItemDiscount,
    orderDiscountApplied,
    grandTotal,
  }
}

export type PosCheckoutValidationErrorCode =
  | "MISSING_WAREHOUSE"
  | "EMPTY_CART"
  | "INVALID_CUSTOMER"
  | "INVALID_SALESPERSON"
  | "INVALID_DUE_DATE"

export function validatePosCheckout(input: {
  warehouseId?: string
  items: readonly PosCartLine[]
  salespersonName: string
  customerName: string
  customerAddress: string
  customerPhone?: string
  paymentStatus: PosPaymentStatus
  dueDate?: string
}): Result<true, { code: PosCheckoutValidationErrorCode; message: string }> {
  const items = Array.isArray(input.items) ? input.items : []

  if (!String(input.warehouseId ?? "").trim()) {
    return err({
      code: "MISSING_WAREHOUSE",
      message: "Zona gudang kasir belum tersedia. Pastikan ada minimal 1 zona gudang aktif.",
    })
  }

  if (items.length === 0) {
    return err({ code: "EMPTY_CART", message: "Keranjang kosong." })
  }

  if (!String(input.salespersonName ?? "").trim()) {
    return err({
      code: "INVALID_SALESPERSON",
      message: "Tenaga penjual wajib diisi sebelum proses pembayaran.",
    })
  }

  const customerName = String(input.customerName ?? "").trim()
  const customerAddress = String(input.customerAddress ?? "").trim()
  if (!customerName || !customerAddress) {
    return err({
      code: "INVALID_CUSTOMER",
      message: "Nama dan alamat pelanggan wajib diisi sebelum proses pembayaran.",
    })
  }

  if (input.paymentStatus === "tempo") {
    const due = String(input.dueDate ?? "").trim()
    if (!due) {
      return err({
        code: "INVALID_DUE_DATE",
        message: "Jatuh tempo wajib diisi untuk transaksi tempo.",
      })
    }

    const parsed = new Date(due)
    if (Number.isNaN(parsed.getTime())) {
      return err({
        code: "INVALID_DUE_DATE",
        message: "Jatuh tempo wajib diisi untuk transaksi tempo.",
      })
    }
  }

  return ok(true)
}

export function normalizePaidAmount(input: {
  paymentStatus: PosPaymentStatus
  grandTotal: Money
  paidAmountInput?: number
}): { paidAmount: Money } {
  const grandTotal = Math.max(0, Math.round(Number(input.grandTotal) || 0))

  if (input.paymentStatus === "tunai") {
    return { paidAmount: grandTotal }
  }

  const raw = Number(input.paidAmountInput ?? 0)
  const paidAmountInput = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0
  return { paidAmount: Math.min(paidAmountInput, grandTotal) }
}
