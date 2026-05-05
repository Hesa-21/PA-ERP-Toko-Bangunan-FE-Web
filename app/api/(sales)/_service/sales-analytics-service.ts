import { computeSalesAnalyticsStatus, dayKeyJakarta, formatWeekdayShortJakarta } from "@/lib/domain/sales-analytics"
import { isTodayJakarta } from "@/lib/utils/date"
import { getSales } from "@/lib/server/mock-db"
import { computeSalesTotal } from "@/lib/domain"

export type SummaryDto = {
  totalRevenue: number
  pendingAmount: number
  totalTransactions: number
}

export type WeeklyPointDto = {
  day: string
  sales: number
  amount: number
}

export function buildSalesSummary(input: { branch: string; scope: string }): SummaryDto {
  const docs = getSales(input.branch)
  const now = new Date()

  const docsScoped = docs.filter((doc) => {
    if (input.scope === "today") {
      const when = doc.postedAt ?? doc.createdAt
      return isTodayJakarta(when, now)
    }
    return true
  })

  let totalRevenue = 0
  let pendingAmount = 0
  let totalTransactions = 0

  for (const doc of docsScoped) {
    const total = computeSalesTotal(doc)
    const paid = doc.paymentStatus === "tunai" ? total : Math.min(Math.max(0, Number(doc.paidAmount ?? 0) || 0), total)
    const remaining = doc.paymentStatus === "tunai" ? 0 : Math.max(0, total - paid)

    const status = computeSalesAnalyticsStatus(doc, total)
    if (status === "Paid" || status === "Pending") {
      totalRevenue += total
      totalTransactions += 1
    }
    if (status === "Pending") {
      pendingAmount += remaining
    }
  }

  return {
    totalRevenue,
    pendingAmount,
    totalTransactions,
  }
}

export function buildSalesWeekly(input: { branch: string }): WeeklyPointDto[] {
  const docs = getSales(input.branch)
  const now = new Date()

  const points: WeeklyPointDto[] = []
  const seeded = new Map<string, { date: Date; amount: number }>()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    seeded.set(dayKeyJakarta(d), { date: d, amount: 0 })
  }

  for (const doc of docs) {
    const whenIso = doc.postedAt ?? doc.createdAt
    const when = new Date(whenIso)
    if (Number.isNaN(when.getTime())) continue

    const key = dayKeyJakarta(when)
    const bucket = seeded.get(key)
    if (!bucket) continue

    const total = computeSalesTotal(doc)
    const status = computeSalesAnalyticsStatus(doc, total)
    if (status === "Cancelled") continue

    bucket.amount += total
  }

  for (const { date, amount } of seeded.values()) {
    points.push({
      day: formatWeekdayShortJakarta(date),
      amount: Math.round(amount),
      sales: Math.round((amount / 1_000_000) * 10) / 10,
    })
  }

  return points
}
