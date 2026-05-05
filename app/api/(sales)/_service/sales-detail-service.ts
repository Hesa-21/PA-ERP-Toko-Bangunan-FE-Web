import { isTodayJakarta } from "@/lib/utils/date"
import { ensureBranchState, getSale, voidSale } from "@/lib/server/mock-db"
import { computeSalesTotal, type SalesDocument } from "@/lib/domain"

export type SalesDetailDto = {
  doc: {
    id: string
    status: SalesDocument["status"]
    createdAt: string
    postedAt?: string
    customerName?: string
    customerAddress?: string
    customerPhone?: string
    salespersonName?: string
    paymentStatus: "tunai" | "tempo"
    paidAmount: number
    dueDate?: string
    orderDiscount: number
    totals: {
      total: number
      remaining: number
    }
    items: Array<{
      sku: string
      name: string
      quantity: number
      unitPrice: number
      discount: number
    }>
  }
}

export function getSalesDetail(input: { branch: string; saleId: string }): SalesDetailDto {
  const doc = getSale(input.branch, input.saleId)
  const total = computeSalesTotal(doc)
  const paid = Math.max(0, Number(doc.paidAmount ?? 0) || 0)
  const remaining = Math.max(0, total - paid)

  const state = ensureBranchState(input.branch)
  const nameBySku = new Map(state.products.map((p) => [p.sku.toLowerCase(), p.name]))

  return {
    doc: {
      id: doc.id,
      status: doc.status,
      createdAt: doc.createdAt,
      postedAt: doc.postedAt,
      customerName: doc.customerName,
      customerAddress: doc.customerAddress,
      customerPhone: doc.customerPhone,
      salespersonName: doc.salespersonName,
      paymentStatus: doc.paymentStatus,
      paidAmount: paid,
      dueDate: doc.dueDate,
      orderDiscount: doc.orderDiscount,
      totals: { total, remaining },
      items: doc.items.map((it) => ({
        sku: it.sku,
        name: nameBySku.get(it.sku.toLowerCase()) ?? it.sku,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
      })),
    },
  }
}

export function voidSaleWithPolicy(input: {
  branch: string
  saleId: string
  userName: string
  userRole: string
  now: Date
}) {
  const existing = getSale(input.branch, input.saleId)

  if (existing.status === "POSTED") {
    const when = existing.postedAt ?? existing.createdAt
    if (!isTodayJakarta(when, input.now)) {
      throw new Error("VOID_POSTED_CUTOFF")
    }
  }

  return voidSale({ branchId: input.branch, saleId: input.saleId, voidedBy: input.userName })
}
