export type DashboardBranchStats = {
  totalRevenue?: number
  totalTransactions?: number
}

export type DashboardDailySales = {
  day: string
  sales: number
  amount: number
}

export type DashboardRecentStatus = "Draft" | "Confirmed" | "Paid" | "Pending" | "Cancelled"

export type DashboardRecentTransaction = {
  id: string
  status: DashboardRecentStatus
  customer: string
  items: number
  total: number
  date: string
}

export type DashboardSnapshot = {
  statsData?: Record<string, DashboardBranchStats>
  salesChartData?: Record<string, DashboardDailySales[]>
  recentTransactionsData?: Record<string, DashboardRecentTransaction[]>
}
