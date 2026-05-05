"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  cancelSale as cancelSaleApi,
  exportSales,
  getSaleDetail,
  listSales,
  openSalePrintWithPrice,
  openSalePrintWithoutPrice,
  type SalesDetailDto,
  type SalesListItemDto,
  type SalesListQuery,
  type SalesStatusUi,
} from "@/app/sales/_api-clients/sales"

export type { SalesDetailDto, SalesListItemDto, SalesStatusUi }

export function useSales(input: { query?: SalesListQuery }) {
  const query = input.query
  const q = (query?.q ?? "").trim()
  const status = (query?.status ?? "") as SalesStatusUi | ""
  const from = (query?.from ?? "").trim()
  const to = (query?.to ?? "").trim()
  const page = query?.page
  const limit = query?.limit

  const [salesData, setSalesData] = useState<SalesListItemDto[]>([])
  const [total, setTotal] = useState(0)
  const [resolvedPage, setResolvedPage] = useState(1)
  const [resolvedLimit, setResolvedLimit] = useState(5)

  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string>("")
  const listRequestIdRef = useRef(0)

  const reloadAll = useCallback(async () => {
    const requestId = listRequestIdRef.current + 1
    listRequestIdRef.current = requestId
    const isCurrentRequest = () => requestId === listRequestIdRef.current

    setIsLoading(true)
    setLoadError("")

    try {
      const res = await listSales({ q, status, from, to, page, limit })
      if (!isCurrentRequest()) return
      setSalesData(res.items)
      setTotal(res.total)
      setResolvedPage(res.page)
      setResolvedLimit(res.limit)
    } catch (err: unknown) {
      if (!isCurrentRequest()) return
      setSalesData([])
      setTotal(0)
      setResolvedPage(1)
      setResolvedLimit(5)
      setLoadError(err instanceof Error ? err.message : "Gagal memuat penjualan")
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false)
      }
    }
  }, [q, status, from, to, page, limit])

  const reloadSales = useCallback(async () => {
    const requestId = listRequestIdRef.current + 1
    listRequestIdRef.current = requestId
    const isCurrentRequest = () => requestId === listRequestIdRef.current

    try {
      const res = await listSales({ q, status, from, to, page, limit })
      if (!isCurrentRequest()) return
      setSalesData(res.items)
      setTotal(res.total)
      setResolvedPage(res.page)
      setResolvedLimit(res.limit)
    } catch (err: unknown) {
      if (!isCurrentRequest()) return
      setSalesData([])
      setTotal(0)
      setResolvedPage(1)
      setResolvedLimit(5)
      throw err
    }
  }, [q, status, from, to, page, limit])

  useEffect(() => {
    const handle = setTimeout(() => {
      void reloadAll()
    }, 250)
    return () => clearTimeout(handle)
  }, [reloadAll])

  useEffect(() => {
    return () => {
      listRequestIdRef.current += 1
    }
  }, [])

  const loadSaleDetail = useCallback(
    async (saleId: string): Promise<SalesDetailDto> => {
      return getSaleDetail({ saleId })
    },
    []
  )

  const cancelSale = useCallback(
    async (saleId: string) => {
      await cancelSaleApi({ saleId })
      await reloadAll()
    },
    [reloadAll]
  )

  const downloadExport = useCallback(
    async (input: { branchCode: string; q?: string; status?: SalesStatusUi | ""; from?: string; to?: string }) => {
      try {
        const { blob, filename } = await exportSales({
          branchCode: input.branchCode,
          q: input.q,
          status: input.status,
          from: input.from,
          to: input.to,
        })

        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      } catch (err) {
        if (err instanceof Error) throw err
        throw new Error("Gagal mengunduh ekspor")
      }
    },
    []
  )

  const openPrint = useCallback(
    async (saleId: string) => {
      await openSalePrintWithPrice({ saleId })
    },
    []
  )

  const openPrintNoPrice = useCallback(
    async (saleId: string) => {
      await openSalePrintWithoutPrice({ saleId })
    },
    []
  )

  return {
    salesData,
    total,
    page: resolvedPage,
    limit: resolvedLimit,
    isLoading,
    loadError,

    reloadSales,
    reloadAll,

    loadSaleDetail,
    cancelSale,
    downloadExport,
    openPrint,
    openPrintNoPrice,
  }
}
