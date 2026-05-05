export type DashboardScope = "" | "today"

export type DashboardSalesStatus = "Draft" | "Confirmed" | "Paid" | "Pending" | "Cancelled"

export type DashboardSummaryDto = {
  totalRevenue: number
  pendingAmount: number
  totalTransactions: number
}

export type DashboardWeeklyPointDto = {
  day: string
  sales: number
  amount: number
}

export type DashboardRecentItemDto = {
  id: string
  date: string
  customer: string
  items: number
  total: number
  status: DashboardSalesStatus
}

export type DashboardRecentResult = {
  items: DashboardRecentItemDto[]
  total: number
  page: number
  limit: number
}

export type DashboardSnapshotApiDto = {
  summary: DashboardSummaryDto
  recent: DashboardRecentResult
  weekly: DashboardWeeklyPointDto[]
}
