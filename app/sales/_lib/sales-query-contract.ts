export type SalesStatusUi = "Draft" | "Confirmed" | "Paid" | "Pending" | "Cancelled"

const STATUS_VALUES = new Set<SalesStatusUi>(["Draft", "Confirmed", "Paid", "Pending", "Cancelled"])
const MAX_QUERY_LENGTH = 120

function toSafeInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return Math.trunc(value)
}

function clamp(value: number | undefined, min: number, max: number): number | undefined {
  if (typeof value !== "number") return undefined
  return Math.max(min, Math.min(max, value))
}

export function parseIsoDateInput(value: string | undefined): string {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ""

  const [year, month, day] = raw.split("-").map((v) => Number(v))
  if (!year || !month || !day) return ""

  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) return ""
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return ""

  return raw
}

export function normalizeSalesStatus(value: string | undefined): SalesStatusUi | "" {
  const raw = String(value ?? "").trim()
  if (!raw || raw === "all") return ""
  return STATUS_VALUES.has(raw as SalesStatusUi) ? (raw as SalesStatusUi) : ""
}

export function normalizeSalesSearchTerm(value: string | undefined): string {
  return String(value ?? "").trim().slice(0, MAX_QUERY_LENGTH)
}

export function validateSalesDateRange(input: { from?: string; to?: string }): string {
  const fromRaw = String(input.from ?? "").trim()
  const toRaw = String(input.to ?? "").trim()

  if (!fromRaw && !toRaw) return ""

  const from = parseIsoDateInput(fromRaw)
  const to = parseIsoDateInput(toRaw)

  if (!from || !to) {
    return "Lengkapi tanggal Dari dan Sampai dengan format yang valid."
  }

  if (new Date(from).getTime() > new Date(to).getTime()) {
    return "Tanggal Dari tidak boleh lebih besar dari Tanggal Sampai."
  }

  return ""
}

export function normalizeSalesListFilters(input: {
  q?: string
  status?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}) {
  const q = normalizeSalesSearchTerm(input.q)
  const status = normalizeSalesStatus(input.status)
  const from = parseIsoDateInput(input.from)
  const to = parseIsoDateInput(input.to)

  const page = clamp(toSafeInt(input.page), 1, 100_000)
  const limit = clamp(toSafeInt(input.limit), 1, 200)

  // Keep date filters strict: only send when the full range is valid.
  const validDateRange = Boolean(from && to && new Date(from).getTime() <= new Date(to).getTime())

  return {
    q,
    status,
    from: validDateRange ? from : "",
    to: validDateRange ? to : "",
    page,
    limit,
  }
}

export function canExportSalesWithRange(input: { from?: string; to?: string }): boolean {
  return validateSalesDateRange(input) === ""
}