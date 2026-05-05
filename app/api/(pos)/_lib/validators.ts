import { z } from "zod"
import type { PriceTier } from "@/lib/domain"
import type { PosPaymentStatus } from "@/lib/domain/pos"

export type PosSalesBodyLine = {
  sku: string
  quantity: number
  unitPrice: number
  discount: number
  priceTier: PriceTier
  warehouseId?: string
}

export type PosSalesBody = {
  warehouseId?: string
  salespersonName: string
  paymentStatus: PosPaymentStatus
  paidAmount: number
  dueDate?: string
  orderDiscount: number
  customerName: string
  customerAddress: string
  customerPhone?: string
  items: PosSalesBodyLine[]
}

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const finiteNumber = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return Number.NaN
    return Number(trimmed)
  }
  return value
}, z.number().finite())

const nonNegativeNumber = finiteNumber.refine((value) => value >= 0, {
  message: "harus >= 0",
})

const positiveInt = finiteNumber.refine((value) => Number.isInteger(value) && value > 0, {
  message: "harus bilangan bulat > 0",
})

const lineSchema = z.object({
  sku: z.string().trim().min(1),
  quantity: positiveInt,
  unitPrice: nonNegativeNumber,
  discount: nonNegativeNumber,
  priceTier: z.enum(["retail", "partai", "cabang"]),
  warehouseId: z.string().optional(),
})

const posSalesBodySchema = z.object({
  warehouseId: z.string().optional(),
  salespersonName: z.string().trim().min(1),
  paymentStatus: z.enum(["tunai", "tempo"]),
  paidAmount: nonNegativeNumber,
  dueDate: z.string().optional(),
  orderDiscount: nonNegativeNumber,
  customerName: z.string().trim().min(1),
  customerAddress: z.string().trim().min(1),
  customerPhone: z.string().optional(),
  items: z.array(lineSchema).min(1),
})

function parsePosBodyError(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return "Payload POS tidak valid."

  const path = issue.path.length > 0 ? issue.path.join(".") : "payload"
  return `Payload POS tidak valid pada ${path}.`
}

export function parsePosSalesBody(raw: unknown): ParseResult<PosSalesBody> {
  const parsed = posSalesBodySchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsePosBodyError(parsed.error) }
  }

  const body = parsed.data

  const items: PosSalesBodyLine[] = (body.items ?? []).map((line) => ({
    sku: String(line.sku ?? "").trim(),
    quantity: Number(line.quantity ?? 0),
    unitPrice: Number(line.unitPrice ?? 0),
    discount: Number(line.discount ?? 0),
    priceTier: (line.priceTier ?? "retail") as PriceTier,
    warehouseId: String(line.warehouseId ?? "").trim() || undefined,
  }))

  const paymentStatus: PosPaymentStatus = body.paymentStatus ?? "tunai"

  return {
    ok: true,
    data: {
      warehouseId: (body.warehouseId ?? "").trim() || undefined,
      salespersonName: (body.salespersonName ?? "").trim(),
      paymentStatus,
      paidAmount: Number(body.paidAmount ?? 0),
      dueDate: (body.dueDate ?? "").trim() || undefined,
      orderDiscount: Number(body.orderDiscount ?? 0),
      customerName: (body.customerName ?? "").trim(),
      customerAddress: (body.customerAddress ?? "").trim(),
      customerPhone: (body.customerPhone ?? "").trim() || undefined,
      items,
    },
  }
}

export function validatePosSalesBody(input: PosSalesBody) {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false as const, error: "items wajib minimal 1 baris." }
  }

  if (!Number.isFinite(input.orderDiscount) || input.orderDiscount < 0) {
    return { ok: false as const, error: "orderDiscount tidak valid." }
  }

  if (!Number.isFinite(input.paidAmount) || input.paidAmount < 0) {
    return { ok: false as const, error: "paidAmount tidak valid." }
  }

  if (input.paymentStatus === "tempo") {
    const dueDate = String(input.dueDate ?? "").trim()
    if (!dueDate) return { ok: false as const, error: "Jatuh tempo wajib diisi untuk transaksi tempo." }

    const parsedDueDate = new Date(dueDate)
    if (Number.isNaN(parsedDueDate.getTime())) {
      return { ok: false as const, error: "Jatuh tempo wajib diisi untuk transaksi tempo." }
    }
  }

  for (const item of input.items) {
    if (!item.sku) return { ok: false as const, error: "SKU wajib di setiap item." }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false as const, error: "quantity harus bilangan bulat > 0." }
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      return { ok: false as const, error: "unitPrice tidak valid." }
    }

    if (!Number.isFinite(item.discount) || item.discount < 0) {
      return { ok: false as const, error: "discount tidak valid." }
    }

    if (item.discount > item.unitPrice) {
      return { ok: false as const, error: "discount tidak boleh melebihi unitPrice." }
    }
  }

  return { ok: true as const }
}
