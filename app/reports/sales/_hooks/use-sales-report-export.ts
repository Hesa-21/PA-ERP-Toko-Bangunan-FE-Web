"use client"

import { useCallback, useRef, useState } from "react"
import { exportSalesReport } from "@/app/reports/sales/_api-clients/sales-report"
import type { SalesReportExportQuery } from "@/app/reports/sales/_lib/sales-report-front-contract"

export function useSalesReportExport(input: {
  branchId: string
  branchCode: string
}) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  const cancelExport = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const exportReport = useCallback(
    async (
      payload: Omit<SalesReportExportQuery, "branchId" | "branchCode">,
      options?: { download?: boolean }
    ) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setExportError("")
      setIsExporting(true)

      try {
        const result = await exportSalesReport(
          {
            branchId: input.branchId,
            branchCode: input.branchCode,
            from: payload.from,
            to: payload.to,
            paymentType: payload.paymentType,
            view: payload.view,
          },
          { signal: controller.signal }
        )

        const shouldDownload = options?.download !== false
        if (shouldDownload) {
          const url = URL.createObjectURL(result.blob)
          const a = document.createElement("a")
          a.href = url
          a.download = result.filename
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }

        return result
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          throw new Error("Ekspor dibatalkan.")
        }

        const message = err instanceof Error ? err.message : "Gagal mengekspor laporan penjualan."
        setExportError(message)
        throw new Error(message)
      } finally {
        setIsExporting(false)
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [input.branchCode, input.branchId]
  )

  return {
    isExporting,
    exportError,
    exportReport,
    cancelExport,
  }
}
