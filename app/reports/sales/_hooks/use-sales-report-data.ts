"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { listSalesReport } from "@/app/reports/sales/_api-clients/sales-report"
import {
  normalizeSalesReportListQuery,
  type SalesReportListQuery,
} from "@/app/reports/sales/_lib/sales-report-front-contract"
import {
  mapSalesReportTableModel,
  type SalesReportTableModel,
} from "@/app/reports/sales/_lib/sales-report-models"

export function useSalesReportData(input: {
  query: SalesReportListQuery
  enabled?: boolean
}) {
  const enabled = input.enabled ?? true
  const normalizedQuery = useMemo(() => normalizeSalesReportListQuery(input.query), [input.query])

  const [table, setTable] = useState<SalesReportTableModel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState("")
  const [hasLoaded, setHasLoaded] = useState(false)

  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const hasLoadedRef = useRef(false)

  const runFetch = useCallback(
    async () => {
      if (!enabled) return

      requestIdRef.current += 1
      const requestId = requestIdRef.current

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setError("")
      if (!hasLoadedRef.current) {
        setIsLoading(true)
      }
      setIsFetching(true)

      try {
        const dto = await listSalesReport(normalizedQuery, { signal: controller.signal })
        if (requestId !== requestIdRef.current) return

        setTable(mapSalesReportTableModel(dto))
        hasLoadedRef.current = true
        setHasLoaded(true)
      } catch (err: unknown) {
        if (controller.signal.aborted) return
        if (requestId !== requestIdRef.current) return

        setTable(null)
        hasLoadedRef.current = true
        setHasLoaded(true)
        setError(err instanceof Error ? err.message : "Gagal memuat laporan penjualan.")
      } finally {
        if (requestId !== requestIdRef.current) return
        setIsLoading(false)
        setIsFetching(false)
      }
    },
    [enabled, normalizedQuery]
  )

  useEffect(() => {
    void runFetch()

    return () => {
      abortRef.current?.abort()
    }
  }, [runFetch])

  const refetch = useCallback(async () => {
    await runFetch()
  }, [runFetch])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    table,
    isLoading,
    isFetching,
    error,
    isEmpty: !isLoading && !error && (table?.rows.length ?? 0) === 0,
    hasLoaded,
    refetch,
    cancel,
  }
}
