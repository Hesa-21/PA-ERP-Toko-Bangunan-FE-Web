export type SalesReportViewKey = "period" | "customer" | "supplier"

export type SalesReportUiState = "initial" | "loading" | "empty" | "error" | "ready"

export type SalesPaymentType = "all" | "cash" | "credit"

export interface SalesReportFilterModel {
  periodFrom: string
  periodTo: string
  paymentType: SalesPaymentType
}

export const SALES_REPORT_DEFAULT_FILTERS: SalesReportFilterModel = {
  periodFrom: "",
  periodTo: "",
  paymentType: "all",
}

export function isPeriodRangeValid(periodFrom: string, periodTo: string): boolean {
  if (!periodFrom || !periodTo) return false
  const from = new Date(periodFrom)
  const to = new Date(periodTo)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false
  return from.getTime() <= to.getTime()
}

export function canEnableExport(state: SalesReportUiState, filters: SalesReportFilterModel): boolean {
  if (state !== "ready") return false
  return isPeriodRangeValid(filters.periodFrom, filters.periodTo)
}
