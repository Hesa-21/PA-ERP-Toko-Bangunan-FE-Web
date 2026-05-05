import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, DollarSign } from "lucide-react"
import { formatIDR } from "@/lib/utils"
import type { DashboardBranchStats } from "@/app/dashboard/_lib/dashboard-types"

interface DashboardStatsProps {
  selectedBranch: string
  data?: Record<string, DashboardBranchStats>
}

export function DashboardStats({ selectedBranch, data }: DashboardStatsProps) {
  const branchStats = data?.[selectedBranch]

  const salesValue =
    typeof branchStats?.totalRevenue === "number"
      ? formatIDR(branchStats.totalRevenue)
      : "-"

  const transactionsValue =
    typeof branchStats?.totalTransactions === "number"
      ? String(branchStats.totalTransactions)
      : "-"

  const stats = [
    {
      title: "Total Penjualan Hari Ini",
      value: salesValue,
      icon: DollarSign,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      borderColor: "border-green-200",
    },
    {
      title: "Transaksi Hari Ini",
      value: transactionsValue,
      icon: ShoppingCart,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200",
    },
  ]
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className={`shadow-sm border-0 ${stat.bgColor} ${stat.borderColor} border hover:shadow-md transition-shadow duration-200`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg bg-white ${stat.iconColor}`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}