import {
  SALES_DEFAULT_LIMIT,
  SALES_DEFAULT_PAGE,
  SALES_MAX_LIMIT,
  SALES_MAX_QUERY_LENGTH,
  type SalesListRouteQuery,
  type SalesScope,
  type SalesStatusFilter,
  type SalesSummaryRouteQuery,
} from "@/app/api/(sales)/_lib/query-contracts"
import { getCentralBranchId } from "@/lib/single-branch"

export function parseIsoDate(value: string | null): Date | null {
  const raw = (value ?? "").trim()
  if (!raw) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const [year, month, day] = raw.split("-").map((v) => Number(v))
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return Number.isNaN(date.getTime()) ? null : date
}

function parseScopeParam(raw: string): { value: SalesScope; invalid: boolean } {
  const value = raw.trim().toLowerCase()
  if (!value) return { value: "", invalid: false }
  if (value === "today") return { value: "today", invalid: false }
  return { value: "", invalid: true }
}

const salesStatusFilterValues: ReadonlySet<SalesStatusFilter> = new Set([
  "Draft",
  "Confirmed",
  "Paid",
  "Pending",
  "Cancelled",
  "",
])

function parseStatusFilterParam(raw: string): { value: SalesStatusFilter; invalid: boolean } {
  const value = raw.trim()
  if (!value) return { value: "", invalid: false }
  if (salesStatusFilterValues.has(value as SalesStatusFilter)) {
    return { value: value as SalesStatusFilter, invalid: false }
  }
  return { value: "", invalid: true }
}

function parsePositiveIntParam(input: string | null, fallback: number, max: number): { value: number; invalid: boolean } {
  const raw = (input ?? "").trim()
  if (!raw) return { value: fallback, invalid: false }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { value: fallback, invalid: true }
  }

  const normalized = Math.trunc(parsed)
  return {
    value: Math.max(1, Math.min(max, normalized)),
    invalid: false,
  }
}

export function parseSalesListRouteQuery(url: URL): SalesListRouteQuery {
  const sp = url.searchParams
  const branch = getCentralBranchId()
  const scope = parseScopeParam(sp.get("scope") ?? "")
  const q = (sp.get("q") ?? "").trim().toLowerCase().slice(0, SALES_MAX_QUERY_LENGTH)
  const statusFilter = parseStatusFilterParam(sp.get("status") ?? "")

  const fromRaw = (sp.get("from") ?? "").trim()
  const toRaw = (sp.get("to") ?? "").trim()
  const fromDate = parseIsoDate(fromRaw)
  const toDate = parseIsoDate(toRaw)
  const invalidFromParam = Boolean(fromRaw) && fromDate === null
  const invalidToParam = Boolean(toRaw) && toDate === null

  const page = parsePositiveIntParam(sp.get("page"), SALES_DEFAULT_PAGE, Number.MAX_SAFE_INTEGER)
  const limit = parsePositiveIntParam(sp.get("limit"), SALES_DEFAULT_LIMIT, SALES_MAX_LIMIT)
  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate.getTime() > toDate.getTime())

  return {
    branch,
    scope: scope.value,
    q,
    statusFilter: statusFilter.value,
    fromDate,
    toDate,
    pageRaw: page.value,
    limitRaw: limit.value,
    invalidScopeParam: scope.invalid,
    invalidStatusParam: statusFilter.invalid,
    invalidFromParam,
    invalidToParam,
    invalidPageParam: page.invalid,
    invalidLimitParam: limit.invalid,
    dateRangeInvalid,
  }
}

export function parseSalesSummaryRouteQuery(url: URL): SalesSummaryRouteQuery {
  const sp = url.searchParams
  const branch = getCentralBranchId()
  const scope = parseScopeParam(sp.get("scope") ?? "")

  return {
    branch,
    scope: scope.value,
    invalidScopeParam: scope.invalid,
  }
}

export function validateSalesListRouteQuery(query: SalesListRouteQuery) {
  if (query.invalidScopeParam) {
    return { ok: false as const, error: "scope tidak valid. Gunakan kosong atau 'today'." }
  }
  if (query.invalidStatusParam) {
    return {
      ok: false as const,
      error: "status tidak valid. Gunakan Draft, Confirmed, Paid, Pending, atau Cancelled.",
    }
  }
  if (query.invalidFromParam || query.invalidToParam) {
    return { ok: false as const, error: "from/to tidak valid. Gunakan format YYYY-MM-DD." }
  }
  if (query.dateRangeInvalid) {
    return { ok: false as const, error: "from tidak boleh lebih besar dari to." }
  }
  if (query.invalidPageParam) {
    return { ok: false as const, error: "page harus bilangan bulat positif." }
  }
  if (query.invalidLimitParam) {
    return { ok: false as const, error: `limit harus bilangan bulat positif (maks ${SALES_MAX_LIMIT}).` }
  }

  return { ok: true as const }
}

export function validateSalesSummaryRouteQuery(query: SalesSummaryRouteQuery) {
  if (query.invalidScopeParam) {
    return { ok: false as const, error: "scope tidak valid. Gunakan kosong atau 'today'." }
  }

  return { ok: true as const }
}

export function validateBranchRequired(branch: string):
  | { ok: true }
  | { ok: false; error: string } {
  void branch
  return { ok: true as const }
}

export function validateSaleIdRequired(saleId: string) {
  const value = (saleId ?? "").trim()
  if (!value) return { ok: false as const, error: "saleId wajib." }
  return { ok: true as const, value }
}

export function validateExportDateRange(input: { fromDate: Date | null; toDate: Date | null }) {
  if (!input.fromDate || !input.toDate) {
    return { ok: false as const, error: "from dan to wajib diisi." }
  }
  if (input.fromDate.getTime() > input.toDate.getTime()) {
    return { ok: false as const, error: "from tidak boleh lebih besar dari to." }
  }
  return { ok: true as const }
}

