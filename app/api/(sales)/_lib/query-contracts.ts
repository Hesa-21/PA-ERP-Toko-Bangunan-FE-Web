export const SALES_DEFAULT_PAGE = 1
export const SALES_DEFAULT_LIMIT = 5
export const SALES_MAX_LIMIT = 200
export const SALES_MAX_QUERY_LENGTH = 120

export type SalesScope = "" | "today"
export type SalesStatusFilter = "Draft" | "Confirmed" | "Paid" | "Pending" | "Cancelled" | ""

export type SalesListRouteQuery = {
  branch: string
  scope: SalesScope
  q: string
  statusFilter: SalesStatusFilter
  fromDate: Date | null
  toDate: Date | null
  pageRaw: number
  limitRaw: number
  invalidScopeParam: boolean
  invalidStatusParam: boolean
  invalidFromParam: boolean
  invalidToParam: boolean
  invalidPageParam: boolean
  invalidLimitParam: boolean
  dateRangeInvalid: boolean
}

export type SalesSummaryRouteQuery = {
  branch: string
  scope: SalesScope
  invalidScopeParam: boolean
}