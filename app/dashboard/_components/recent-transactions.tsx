"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Clock, CheckCircle, XCircle } from "lucide-react"
import { formatIDR } from "@/lib/utils"
import type { DashboardRecentTransaction } from "@/app/dashboard/_lib/dashboard-types"

interface RecentTransactionsProps {
  selectedBranch: string
  data?: Record<string, DashboardRecentTransaction[]>
}

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
})

function getStatusLabel(status: DashboardRecentTransaction["status"]): string {
  if (status === "Paid") return "Lunas"
  if (status === "Pending") return "Belum Lunas"
  if (status === "Cancelled") return "Dibatalkan"
  if (status === "Draft") return "Draf"
  if (status === "Confirmed") return "Terkonfirmasi"
  return status
}

function getStatusBadge(status: DashboardRecentTransaction["status"]): string {
  const variants: Record<DashboardRecentTransaction["status"], string> = {
    Draft: "bg-gray-100 text-gray-800 border-gray-200",
    Confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    Paid: "bg-green-100 text-green-800 border-green-200",
    Pending: "bg-orange-100 text-orange-800 border-orange-200",
    Cancelled: "bg-red-100 text-red-800 border-red-200",
  }

  return variants[status] || variants.Draft
}

function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return dateTimeFormatter.format(d)
}

export function RecentTransactions({ selectedBranch, data }: RecentTransactionsProps) {
  const router = useRouter()
  const transactions = data?.[selectedBranch] ?? []
  const itemsPerPage = 3
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage))
  const safePage = Math.min(page, totalPages - 1)
  const pagedItems = transactions.slice(safePage * itemsPerPage, (safePage + 1) * itemsPerPage)
  const hasData = transactions.length > 0

  return (
    <div className="border-2 border-green-300 rounded-lg shadow-sm bg-white h-full flex flex-col">
      <Card className="bg-white h-full flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Transaksi Terbaru</CardTitle>
              <p className="text-sm text-gray-600">Transaksi penjualan terbaru hari ini</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => router.push("/sales")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Lihat Semua Transaksi
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {hasData ? (
              pagedItems.map((transaction, index) => (
                <div
                  key={`${transaction.id || "trx"}-${safePage * itemsPerPage + index}`}
                  className="flex items-center space-x-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      {(() => {
                        const Icon =
                          transaction.status === "Cancelled"
                            ? XCircle
                            : transaction.status === "Paid" || transaction.status === "Confirmed"
                              ? CheckCircle
                              : Clock
                        return <Icon className="h-5 w-5 text-blue-600" />
                      })()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{transaction.customer}</p>
                        <Badge className={`text-xs ${getStatusBadge(transaction.status)}`}>{getStatusLabel(transaction.status)}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatIDR(transaction.total)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-700">{`${transaction.items} item`}</p>
                      <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">{formatDateTime(transaction.date)}</p>
                    </div>
                    <p className="text-xs font-medium text-gray-600 mt-2 break-all">{transaction.id}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">Belum ada data transaksi untuk cabang ini.</p>
            )}
          </div>
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={!hasData || safePage === 0} onClick={() => setPage(safePage - 1)}>
              Prev
            </Button>
            <span className="text-xs text-gray-600">
              Halaman {hasData ? safePage + 1 : 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasData || safePage === totalPages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}