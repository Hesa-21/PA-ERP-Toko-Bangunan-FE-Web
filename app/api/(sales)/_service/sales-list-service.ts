import { mapSalesListStatus } from "@/lib/domain/sales-analytics"
import { formatDateIdJakarta, getJakartaDayBoundsMs, isTodayJakarta } from "@/lib/utils/date"
import { getSales } from "@/lib/server/mock-db"
import { computeSalesTotal } from "@/lib/domain"
import type { SalesListRouteQuery } from "@/app/api/(sales)/_lib/query-contracts"

export type SalesListItemDto = {
  id: string
  date: string
  customer: string
  items: number
  customerPhone?: string
  total: number
  paid: number
  remaining: number
  status: "Draft" | "Confirmed" | "Paid" | "Pending" | "Cancelled"
  paymentMethod: string
  dueDate: string
  salesperson: string
}

export function listSalesMonitoring(input: SalesListRouteQuery) {
  const docsAll = getSales(input.branch)
  const now = new Date()
  const hasStatusFilter = Boolean(input.statusFilter)
  const hasDateFilter = Boolean(input.fromDate || input.toDate)
  const limit = input.limitRaw
  const offset = (input.pageRaw - 1) * limit

  const fromBoundaryMs = input.fromDate ? getJakartaDayBoundsMs(input.fromDate).startMs : null
  const toBoundaryMs = input.toDate ? getJakartaDayBoundsMs(input.toDate).endMs : null

  const items: SalesListItemDto[] = []
  let total = 0

  for (const doc of docsAll) {
    const whenRaw = doc.postedAt ?? doc.createdAt

    if (input.scope === "today") {
      if (doc.status !== "POSTED") continue
      if (!isTodayJakarta(whenRaw, now)) continue
    }

    const customer = doc.customerName?.trim() || "Walk-in"
    if (input.q && !(doc.id.toLowerCase().includes(input.q) || customer.toLowerCase().includes(input.q))) {
      continue
    }

    const whenDate = new Date(whenRaw)
    const whenMs = Number.isNaN(whenDate.getTime()) ? null : whenDate.getTime()

    if (hasDateFilter) {
      if (whenMs === null) continue
      if (fromBoundaryMs !== null && whenMs < fromBoundaryMs) continue
      if (toBoundaryMs !== null && whenMs > toBoundaryMs) continue
    }

    let computedTotal: number | null = null
    let mappedStatus: SalesListItemDto["status"] | null = null

    if (hasStatusFilter) {
      computedTotal = computeSalesTotal(doc)
      mappedStatus = mapSalesListStatus(doc, computedTotal)
      if (mappedStatus !== input.statusFilter) continue
    }

    const matchedIndex = total
    total += 1

    if (matchedIndex < offset || items.length >= limit) {
      continue
    }

    if (computedTotal === null) {
      computedTotal = computeSalesTotal(doc)
    }
    if (mappedStatus === null) {
      mappedStatus = mapSalesListStatus(doc, computedTotal)
    }

    const paid = Math.max(0, Number(doc.paidAmount ?? 0) || 0)
    const remaining = Math.max(0, computedTotal - paid)
    const paymentMethod = (() => {
      if (doc.paymentStatus === "tunai") return "Tunai"
      if (paid > 0) return "DP"
      return "Tempo"
    })()

    items.push({
      id: doc.id,
      date: formatDateIdJakarta(whenRaw),
      customer,
      items: doc.items.length,
      customerPhone: (doc.customerPhone ?? "").trim() || "-",
      total: computedTotal,
      paid: doc.paymentStatus === "tunai" ? computedTotal : Math.min(paid, computedTotal),
      remaining: doc.paymentStatus === "tunai" ? 0 : remaining,
      status: mappedStatus,
      paymentMethod,
      dueDate: doc.paymentStatus === "tempo" && remaining > 0 ? formatDateIdJakarta(doc.dueDate) : "-",
      salesperson: doc.salespersonName?.trim() || doc.postedBy || doc.createdBy,
    })
  }

  return {
    items,
    total,
    page: input.pageRaw,
    limit,
  }
}
