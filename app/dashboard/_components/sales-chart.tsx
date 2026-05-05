"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatIDR } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { DashboardDailySales } from "@/app/dashboard/_lib/dashboard-types"

interface SalesChartProps {
  selectedBranch: string
  data?: Record<string, DashboardDailySales[]>
}

export function SalesChart({ selectedBranch, data }: SalesChartProps) {
  const salesData = data?.[selectedBranch] ?? []
  const hasData = salesData.length > 0

  const formatCompactIDR = (value: unknown): string => {
    const n = Number(value)
    if (!Number.isFinite(n)) return "Rp 0"
    const abs = Math.abs(n)
    if (abs >= 1_000_000) return `${Math.round(n / 1_000_000)}jt`
    if (abs >= 1_000) return `${Math.round(n / 1_000)}rb`
    return `${Math.round(n)}`
  }

  return (
    <div className="border-2 border-blue-300 rounded-lg shadow-sm bg-white h-full flex flex-col">
      <Card className="bg-white h-full flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Grafik Penjualan Mingguan</CardTitle>
          <p className="text-sm text-gray-600">Tren penjualan 7 hari terakhir</p>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="h-[260px]">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    tickFormatter={(value) => formatCompactIDR(value)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-gray-900">{`Hari: ${label}`}</p>
                            <p className="text-blue-600">{`Penjualan: ${formatIDR(payload[0].payload.amount)}`}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} className="hover:opacity-80 transition-opacity" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-600">Belum ada data penjualan untuk cabang ini.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}