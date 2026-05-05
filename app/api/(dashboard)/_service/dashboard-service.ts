import { computeSalesTotal, type SalesDocument } from "@/lib/domain"
import {
  computeSalesAnalyticsStatus,
  mapSalesListStatus,
} from "@/lib/domain/sales-analytics"
import type {
  DashboardRecentItemDto,
  DashboardRecentResult,
  DashboardScope,
  DashboardSnapshotApiDto,
  DashboardSummaryDto,
  DashboardWeeklyPointDto,
} from "@/lib/domain/dashboard"
import { getSales } from "@/lib/server/mock-db"
import {
  dayKeyJakarta,
  formatWeekdayShortJakarta,
  isTodayJakarta,
} from "@/lib/utils/date"

function normalizeIsoDateTime(value: unknown): string {
  const raw = String(value ?? "").trim()
  if (!raw) return ""

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ""

  return parsed.toISOString()
}

function readDashboardSales(branch: string): SalesDocument[] {
  return getSales(branch)
}

function filterSummaryDocsByScope(docs: readonly SalesDocument[], scope: DashboardScope, now: Date): SalesDocument[] {
  if (scope !== "today") return [...docs]

  return docs.filter((doc) => {
    const when = doc.postedAt ?? doc.createdAt
    return isTodayJakarta(when, now)
  })
}

function isRecentDocInScope(doc: SalesDocument, scope: DashboardScope, now: Date): boolean {
  if (doc.status !== "POSTED") return false
  if (scope !== "today") return true

  const when = doc.postedAt ?? doc.createdAt
  return isTodayJakarta(when, now)
}

function getRecentSortTime(doc: SalesDocument): number {
  const raw = new Date(doc.postedAt ?? doc.createdAt).getTime()
  return Number.isFinite(raw) ? raw : 0
}

type RankedRecentDoc = {
  doc: SalesDocument
  time: number
  order: number
}

function isBetterRecentDoc(a: RankedRecentDoc, b: RankedRecentDoc): boolean {
  if (a.time !== b.time) return a.time > b.time
  return a.order < b.order
}

function insertTopRecentDoc(topDocs: RankedRecentDoc[], candidate: RankedRecentDoc, limit: number): void {
  if (limit <= 0) return

  if (topDocs.length === limit && !isBetterRecentDoc(candidate, topDocs[topDocs.length - 1]!)) {
    return
  }

  let insertAt = topDocs.length
  while (insertAt > 0 && isBetterRecentDoc(candidate, topDocs[insertAt - 1]!)) {
    insertAt -= 1
  }

  topDocs.splice(insertAt, 0, candidate)

  if (topDocs.length > limit) {
    topDocs.pop()
  }
}

function mapRecentDocToDto(doc: SalesDocument): DashboardRecentItemDto {
  const total = computeSalesTotal(doc)
  const status = mapSalesListStatus(doc, total)
  const when = doc.postedAt ?? doc.createdAt

  return {
    id: doc.id,
    date: normalizeIsoDateTime(when),
    customer: doc.customerName?.trim() || "Walk-in",
    items: doc.items.length,
    total,
    status,
  }
}

function buildDashboardSummaryFromDocs(input: {
  docs: readonly SalesDocument[]
  scope: DashboardScope
  now: Date
}): DashboardSummaryDto {
  const docsScoped = filterSummaryDocsByScope(input.docs, input.scope, input.now)

  let totalRevenue = 0
  let pendingAmount = 0
  let totalTransactions = 0

  for (const doc of docsScoped) {
    const total = computeSalesTotal(doc)
    const paid =
      doc.paymentStatus === "tunai"
        ? total
        : Math.min(Math.max(0, Number(doc.paidAmount ?? 0) || 0), total)
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

function buildDashboardRecentFromDocs(input: {
  docs: readonly SalesDocument[]
  scope: DashboardScope
  limit: number
  now: Date
}): DashboardRecentResult {
  const limit = Math.max(1, Math.min(200, Math.trunc(Number(input.limit) || 10)))

  let total = 0
  const topDocs: RankedRecentDoc[] = []

  for (const doc of input.docs) {
    if (!isRecentDocInScope(doc, input.scope, input.now)) continue

    const candidate: RankedRecentDoc = {
      doc,
      time: getRecentSortTime(doc),
      order: total,
    }

    total += 1
    insertTopRecentDoc(topDocs, candidate, limit)
  }

  const items = topDocs.map((entry) => mapRecentDocToDto(entry.doc))

  return {
    items,
    total,
    page: 1,
    limit,
  }
}

function buildDashboardWeeklyFromDocs(input: {
  docs: readonly SalesDocument[]
  now: Date
}): DashboardWeeklyPointDto[] {
  const points: DashboardWeeklyPointDto[] = []

  const seeded = new Map<string, { date: Date; amount: number }>()
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(input.now)
    d.setDate(d.getDate() - i)
    seeded.set(dayKeyJakarta(d), { date: d, amount: 0 })
  }

  for (const doc of input.docs) {
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

export function buildDashboardSummary(input: {
  branch: string
  scope: DashboardScope
}): DashboardSummaryDto {
  const now = new Date()
  const docs = readDashboardSales(input.branch)
  return buildDashboardSummaryFromDocs({
    docs,
    scope: input.scope,
    now,
  })
}

export function buildDashboardRecent(input: {
  branch: string
  scope: DashboardScope
  limit: number
}): DashboardRecentResult {
  const now = new Date()
  const docs = readDashboardSales(input.branch)
  const limit = Math.max(1, Math.min(200, Math.trunc(Number(input.limit) || 10)))

  return buildDashboardRecentFromDocs({
    docs,
    scope: input.scope,
    limit,
    now,
  })
}

export function buildDashboardWeekly(input: {
  branch: string
}): DashboardWeeklyPointDto[] {
  const now = new Date()
  const docs = readDashboardSales(input.branch)
  return buildDashboardWeeklyFromDocs({ docs, now })
}

export function buildDashboardSnapshot(input: {
  branch: string
  scope: DashboardScope
  limit: number
}): DashboardSnapshotApiDto {
  const now = new Date()
  const docs = readDashboardSales(input.branch)
  const limit = Math.max(1, Math.min(200, Math.trunc(Number(input.limit) || 10)))

  return {
    summary: buildDashboardSummaryFromDocs({
      docs,
      scope: input.scope,
      now,
    }),
    recent: buildDashboardRecentFromDocs({
      docs,
      scope: input.scope,
      limit,
      now,
    }),
    weekly: buildDashboardWeeklyFromDocs({
      docs,
      now,
    }),
  }
}
