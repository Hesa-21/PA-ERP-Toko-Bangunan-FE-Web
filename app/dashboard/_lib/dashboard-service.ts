import type { DashboardRecentStatus, DashboardSnapshot } from "@/app/dashboard/_lib/dashboard-types"
import {
  fetchDashboardRecent,
  fetchDashboardSnapshotData,
  fetchDashboardSummary,
  fetchDashboardWeekly,
  type DashboardRecentItemDto,
  type DashboardSnapshotApiDto,
  type DashboardWeeklyPointDto,
} from "@/app/dashboard/_api-clients/dashboard"

function clampNonNegativeNumber(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function clampNonNegativeInt(value: unknown): number {
  return Math.max(0, Math.trunc(clampNonNegativeNumber(value)))
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizeRecentStatus(value: unknown): DashboardRecentStatus {
  const status = String(value ?? "").trim()
  if (status === "Draft") return "Draft"
  if (status === "Confirmed") return "Confirmed"
  if (status === "Paid") return "Paid"
  if (status === "Pending") return "Pending"
  if (status === "Cancelled") return "Cancelled"
  return "Draft"
}

async function safe<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch {
    return { ok: false }
  }
}

export async function fetchDashboardSnapshot(input: {
  branchCode: string
  baseUrl?: string
  cookieHeader?: string | null
  signal?: AbortSignal
}) {
  const { branchCode } = input

  if (!branchCode) return undefined

  const snapshotRes = await safe(() =>
    fetchDashboardSnapshotData({
      scope: "today",
      limit: 10,
      baseUrl: input.baseUrl,
      cookieHeader: input.cookieHeader,
      signal: input.signal,
    })
  )

  let summaryRaw: unknown = {}
  let recentAll: DashboardRecentItemDto[] = []
  let weeklyAll: DashboardWeeklyPointDto[] = []

  if (snapshotRes.ok) {
    const snapshotData = (snapshotRes.data ?? {}) as Partial<DashboardSnapshotApiDto>
    summaryRaw = snapshotData.summary ?? {}
    recentAll = asArray<DashboardRecentItemDto>(snapshotData.recent?.items)
    weeklyAll = asArray<DashboardWeeklyPointDto>(snapshotData.weekly)
  } else {
    const [summaryRes, recentRes, weeklyRes] = await Promise.all([
      safe(() =>
        fetchDashboardSummary({
          scope: "today",
          baseUrl: input.baseUrl,
          cookieHeader: input.cookieHeader,
          signal: input.signal,
        })
      ),
      safe(() =>
        fetchDashboardRecent({
          scope: "today",
          limit: 10,
          baseUrl: input.baseUrl,
          cookieHeader: input.cookieHeader,
          signal: input.signal,
        })
      ),
      safe(() =>
        fetchDashboardWeekly({
          baseUrl: input.baseUrl,
          cookieHeader: input.cookieHeader,
          signal: input.signal,
        })
      ),
    ])

    const allFailed = !summaryRes.ok && !recentRes.ok && !weeklyRes.ok
    if (allFailed) return undefined

    summaryRaw = summaryRes.ok ? summaryRes.data : {}
    recentAll = recentRes.ok ? asArray<DashboardRecentItemDto>(recentRes.data?.items) : []
    weeklyAll = weeklyRes.ok ? asArray<DashboardWeeklyPointDto>(weeklyRes.data) : []
  }

  const summary = {
    totalRevenue: clampNonNegativeNumber((summaryRaw as { totalRevenue?: number }).totalRevenue),
    pendingAmount: clampNonNegativeNumber((summaryRaw as { pendingAmount?: number }).pendingAmount),
    totalTransactions: clampNonNegativeInt((summaryRaw as { totalTransactions?: number }).totalTransactions),
  }

  const recent = recentAll.slice(0, 10)

  const weekly = weeklyAll
    .map((p) => ({
      day: String((p as DashboardWeeklyPointDto).day ?? "").trim(),
      sales: clampNonNegativeInt((p as DashboardWeeklyPointDto).sales),
      amount: clampNonNegativeNumber((p as DashboardWeeklyPointDto).amount),
    }))
    .filter((p) => Boolean(p.day))

  const snapshot: DashboardSnapshot = {
    statsData: {
      [branchCode]: {
        totalRevenue: summary.totalRevenue,
        totalTransactions: summary.totalTransactions,
      },
    },
    salesChartData: {
      [branchCode]: weekly,
    },
    recentTransactionsData: {
      [branchCode]: recent.map((it) => {
        const status = normalizeRecentStatus(it.status)
        return {
          id: String(it.id ?? "").trim(),
          status,
          customer: String(it.customer ?? "").trim(),
          items: clampNonNegativeInt(it.items),
          total: clampNonNegativeNumber(it.total),
          date: String(it.date ?? "").trim(),
        }
      }),
    },
  }

  return snapshot
}
