import { apiFetchJson } from "@/lib/client/http"
import type {
  DashboardRecentItemDto,
  DashboardRecentResult,
  DashboardSnapshotApiDto,
  DashboardSummaryDto,
  DashboardWeeklyPointDto,
} from "@/lib/domain/dashboard"

export type {
  DashboardRecentItemDto,
  DashboardRecentResult,
  DashboardSalesStatus,
  DashboardSnapshotApiDto,
  DashboardSummaryDto,
  DashboardWeeklyPointDto,
} from "@/lib/domain/dashboard"

type RequestOptions = {
  baseUrl?: string
  cookieHeader?: string | null
  signal?: AbortSignal
}

function withBaseUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) return path
  return `${baseUrl}${path}`
}

function buildHeaders(cookieHeader?: string | null): HeadersInit {
  if (!cookieHeader) return {}
  return { cookie: cookieHeader }
}

export async function fetchDashboardSummary(
  input: { scope?: string } & RequestOptions
): Promise<DashboardSummaryDto> {
  const qs = new URLSearchParams()
  const scope = (input.scope ?? "").trim()
  if (scope) qs.set("scope", scope)

  return apiFetchJson<DashboardSummaryDto>(
    withBaseUrl(input.baseUrl, `/api/dashboard/summary?${qs.toString()}`),
    { method: "GET", headers: buildHeaders(input.cookieHeader), signal: input.signal },
    { defaultErrorMessage: "Gagal memuat ringkasan dashboard" }
  )
}

export async function fetchDashboardWeekly(
  input: RequestOptions
): Promise<DashboardWeeklyPointDto[]> {
  const qs = new URLSearchParams()
  return apiFetchJson<DashboardWeeklyPointDto[]>(
    withBaseUrl(input.baseUrl, `/api/dashboard/weekly?${qs.toString()}`),
    { method: "GET", headers: buildHeaders(input.cookieHeader), signal: input.signal },
    { defaultErrorMessage: "Gagal memuat chart dashboard" }
  )
}

export async function fetchDashboardRecent(
  input: { scope?: string; limit?: number } & RequestOptions
): Promise<DashboardRecentResult> {
  const qs = new URLSearchParams()
  const scope = (input.scope ?? "").trim()
  if (scope) qs.set("scope", scope)
  if (typeof input.limit === "number" && Number.isFinite(input.limit)) {
    qs.set("limit", String(Math.max(1, Math.min(200, Math.trunc(input.limit)))))
  }

  const data = await apiFetchJson<Partial<DashboardRecentResult>>(
    withBaseUrl(input.baseUrl, `/api/dashboard/recent?${qs.toString()}`),
    { method: "GET", headers: buildHeaders(input.cookieHeader), signal: input.signal },
    { defaultErrorMessage: "Gagal memuat transaksi dashboard" }
  )

  return {
    items: Array.isArray(data?.items) ? (data.items as DashboardRecentItemDto[]) : [],
    total: typeof data?.total === "number" && Number.isFinite(data.total) ? data.total : 0,
    page: typeof data?.page === "number" && Number.isFinite(data.page) ? data.page : 1,
    limit: typeof data?.limit === "number" && Number.isFinite(data.limit) ? data.limit : 10,
  }
}

export async function fetchDashboardSnapshotData(
  input: { scope?: string; limit?: number } & RequestOptions
): Promise<DashboardSnapshotApiDto> {
  const qs = new URLSearchParams()
  const scope = (input.scope ?? "").trim()
  if (scope) qs.set("scope", scope)
  if (typeof input.limit === "number" && Number.isFinite(input.limit)) {
    qs.set("limit", String(Math.max(1, Math.min(200, Math.trunc(input.limit)))))
  }

  const data = await apiFetchJson<Partial<DashboardSnapshotApiDto>>(
    withBaseUrl(input.baseUrl, `/api/dashboard/snapshot?${qs.toString()}`),
    { method: "GET", headers: buildHeaders(input.cookieHeader), signal: input.signal },
    { defaultErrorMessage: "Gagal memuat snapshot dashboard" }
  )

  const summaryRaw = (data?.summary ?? {}) as Partial<DashboardSummaryDto>
  const recentRaw = (data?.recent ?? {}) as Partial<DashboardRecentResult>

  return {
    summary: {
      totalRevenue:
        typeof summaryRaw.totalRevenue === "number" && Number.isFinite(summaryRaw.totalRevenue)
          ? summaryRaw.totalRevenue
          : 0,
      pendingAmount:
        typeof summaryRaw.pendingAmount === "number" && Number.isFinite(summaryRaw.pendingAmount)
          ? summaryRaw.pendingAmount
          : 0,
      totalTransactions:
        typeof summaryRaw.totalTransactions === "number" && Number.isFinite(summaryRaw.totalTransactions)
          ? summaryRaw.totalTransactions
          : 0,
    },
    recent: {
      items: Array.isArray(recentRaw.items) ? (recentRaw.items as DashboardRecentItemDto[]) : [],
      total: typeof recentRaw.total === "number" && Number.isFinite(recentRaw.total) ? recentRaw.total : 0,
      page: typeof recentRaw.page === "number" && Number.isFinite(recentRaw.page) ? recentRaw.page : 1,
      limit: typeof recentRaw.limit === "number" && Number.isFinite(recentRaw.limit) ? recentRaw.limit : 10,
    },
    weekly: Array.isArray(data?.weekly) ? (data.weekly as DashboardWeeklyPointDto[]) : [],
  }
}
