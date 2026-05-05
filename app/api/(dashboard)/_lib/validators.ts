import type { DashboardScope } from "@/lib/domain/dashboard"
import { getCentralBranchId } from "@/lib/single-branch"

export type { DashboardScope } from "@/lib/domain/dashboard"

function normalizeScope(raw: string): DashboardScope {
  const value = raw.trim().toLowerCase()
  if (value === "today") return "today"
  return ""
}

export type DashboardSummaryQuery = {
  branch: string
  scope: DashboardScope
  scopeRaw: string
  invalidScopeParam: boolean
}

export type DashboardRecentQuery = {
  branch: string
  scope: DashboardScope
  scopeRaw: string
  limit: number
  invalidLimitParam: boolean
  invalidScopeParam: boolean
}

export type DashboardWeeklyQuery = {
  branch: string
}

export function parseDashboardSummaryQuery(url: URL): DashboardSummaryQuery {
  const branch = getCentralBranchId()
  const scopeRaw = (url.searchParams.get("scope") ?? "").trim()
  const scope = normalizeScope(scopeRaw)
  const invalidScopeParam = Boolean(scopeRaw) && scope !== "today"
  return { branch, scope, scopeRaw, invalidScopeParam }
}

export function parseDashboardRecentQuery(url: URL): DashboardRecentQuery {
  const branch = getCentralBranchId()
  const scopeRaw = (url.searchParams.get("scope") ?? "").trim()
  const scope = normalizeScope(scopeRaw)
  const invalidScopeParam = Boolean(scopeRaw) && scope !== "today"
  const limitParam = (url.searchParams.get("limit") ?? "").trim()
  const limitIsInteger = /^[0-9]+$/.test(limitParam)
  const limitRaw = limitParam ? Number(limitParam) : Number.NaN
  const invalidLimitParam = Boolean(limitParam) && (!limitIsInteger || !Number.isFinite(limitRaw) || limitRaw <= 0)
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(200, Math.trunc(limitRaw)))
    : 10

  return {
    branch,
    scope,
    scopeRaw,
    limit,
    invalidLimitParam,
    invalidScopeParam,
  }
}

export function parseDashboardWeeklyQuery(url: URL): DashboardWeeklyQuery {
  const branch = getCentralBranchId()
  return { branch }
}

export function validateDashboardBranch(branch: string):
  | { ok: true }
  | { ok: false; error: string } {
  void branch
  return { ok: true as const }
}

export function validateDashboardRecentQuery(input: DashboardRecentQuery) {
  if (input.invalidLimitParam) return { ok: false as const, error: "limit tidak valid." }
  if (input.invalidScopeParam) return { ok: false as const, error: "scope tidak valid." }
  return { ok: true as const }
}

export function validateDashboardSummaryQuery(input: DashboardSummaryQuery) {
  if (input.invalidScopeParam) return { ok: false as const, error: "scope tidak valid." }
  return { ok: true as const }
}
