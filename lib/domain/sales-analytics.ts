import type { SalesDocument } from "@/lib/domain"
import { dayKeyJakarta, formatWeekdayShortJakarta, isTodayJakarta } from "@/lib/utils/date"

export { dayKeyJakarta, formatWeekdayShortJakarta, isTodayJakarta }

export type SalesListStatusUi = "Draft" | "Confirmed" | "Paid" | "Pending" | "Cancelled"

export function mapSalesListStatus(doc: SalesDocument, total: number): SalesListStatusUi {
  if (doc.status === "VOID") return "Cancelled"
  if (doc.status === "DRAFT") return "Draft"

  if (doc.paymentStatus === "tunai") return "Paid"

  const paid = Math.max(0, Number(doc.paidAmount ?? 0) || 0)
  const remaining = Math.max(0, total - paid)

  if (remaining <= 0) return "Paid"
  return "Pending"
}

export type SalesAnalyticsStatus = "Paid" | "Pending" | "Cancelled"

export function computeSalesAnalyticsStatus(doc: SalesDocument, total: number): SalesAnalyticsStatus {
  if (doc.status === "VOID") return "Cancelled"
  // Ignore drafts in analytics (dashboard & sales summary).
  if (doc.status !== "POSTED") return "Cancelled"

  if (doc.paymentStatus === "tunai") return "Paid"

  const paid = Math.max(0, Number(doc.paidAmount ?? 0) || 0)
  const remaining = Math.max(0, total - paid)
  return remaining <= 0 ? "Paid" : "Pending"
}
