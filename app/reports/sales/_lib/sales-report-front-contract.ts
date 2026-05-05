import type { SalesPaymentType, SalesReportViewKey } from "@/app/reports/sales/_lib/sales-report-ui-contract"
import type {
  SalesReportExportQueryDto,
  SalesReportExportResponseDto,
  SalesReportListQueryDto,
} from "@/app/reports/sales/_api-clients/sales-report.types"

export type SalesReportPaymentQuery = Exclude<SalesPaymentType, "all"> | ""

export type SalesReportListQuery = SalesReportListQueryDto
export type SalesReportExportQuery = SalesReportExportQueryDto
export type SalesReportExportResult = SalesReportExportResponseDto

export const SALES_REPORT_QUERY_DEFAULTS = {
  page: 1,
  limit: 20,
  view: "period" as SalesReportViewKey,
} as const

export function isIsoDate(value: string): boolean {
  if (!value) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

export function validateSalesReportRange(from: string, to: string): boolean {
  if (!isIsoDate(from) || !isIsoDate(to)) return false
  return new Date(from).getTime() <= new Date(to).getTime()
}

export function normalizeSalesReportListQuery(input: SalesReportListQuery): SalesReportListQuery {
  const page = Number.isFinite(input.page) && (input.page ?? 0) > 0
    ? Math.floor(input.page as number)
    : SALES_REPORT_QUERY_DEFAULTS.page

  const limit = Number.isFinite(input.limit) && (input.limit ?? 0) > 0
    ? Math.floor(input.limit as number)
    : SALES_REPORT_QUERY_DEFAULTS.limit

  return {
    branchId: input.branchId.trim(),
    from: input.from.trim(),
    to: input.to.trim(),
    paymentType: (input.paymentType ?? "").trim() as SalesReportPaymentQuery,
    view: input.view ?? SALES_REPORT_QUERY_DEFAULTS.view,
    page,
    limit,
  }
}

export function buildSalesReportQueryParams(input: SalesReportListQuery): URLSearchParams {
  const normalized = normalizeSalesReportListQuery(input)
  const params = new URLSearchParams({
    branchId: normalized.branchId,
    from: normalized.from,
    to: normalized.to,
    page: String(normalized.page ?? SALES_REPORT_QUERY_DEFAULTS.page),
    limit: String(normalized.limit ?? SALES_REPORT_QUERY_DEFAULTS.limit),
    view: normalized.view ?? SALES_REPORT_QUERY_DEFAULTS.view,
  })

  if (normalized.paymentType) {
    params.set("paymentType", normalized.paymentType)
  }

  return params
}

export function validateSalesReportListQuery(input: SalesReportListQuery): string[] {
  const errors: string[] = []
  if (!input.branchId || !input.branchId.trim()) errors.push("branchId wajib diisi")
  if (!input.from || !input.from.trim()) errors.push("from wajib diisi")
  if (!input.to || !input.to.trim()) errors.push("to wajib diisi")
  if (input.from && input.to && !validateSalesReportRange(input.from, input.to)) {
    errors.push("rentang tanggal tidak valid")
  }
  return errors
}
