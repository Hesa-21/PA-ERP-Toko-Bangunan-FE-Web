"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useActiveBranch } from "@/hooks/use-active-branch"
import { useSales, type SalesDetailDto } from "@/app/sales/_hooks/use-sales"
import { getSalesStatusBadge, getSalesStatusLabel } from "@/app/sales/_lib/sales-utils"
import {
  canExportSalesWithRange,
  normalizeSalesListFilters,
  validateSalesDateRange,
} from "@/app/sales/_lib/sales-query-contract"
import { isRole, permissionOf, type Role } from "@/lib/auth/rbac"

export function useSalesController() {
  const { selectedBranch } = useActiveBranch()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  const normalizedQuery = useMemo(
    () =>
      normalizeSalesListFilters({
        q: searchTerm,
        status: statusFilter,
        from: dateFrom,
        to: dateTo,
        page,
        limit: PAGE_SIZE,
      }),
    [dateFrom, dateTo, page, searchTerm, statusFilter]
  )

  const dateRangeError = useMemo(
    () => validateSalesDateRange({ from: dateFrom, to: dateTo }),
    [dateFrom, dateTo]
  )

  const canExport = useMemo(
    () => canExportSalesWithRange({ from: dateFrom, to: dateTo }),
    [dateFrom, dateTo]
  )

  const {
    salesData,
    total,
    page: resolvedPage,
    limit,
    isLoading,
    loadError,
    loadSaleDetail,
    cancelSale,
    downloadExport,
    openPrint,
    openPrintNoPrice,
    reloadAll,
  } = useSales({
    query: {
      q: normalizedQuery.q,
      status: normalizedQuery.status,
      from: normalizedQuery.from,
      to: normalizedQuery.to,
      page: normalizedQuery.page ?? 1,
      limit: normalizedQuery.limit ?? PAGE_SIZE,
    },
  })

  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / (limit || PAGE_SIZE)))

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleFromChange = (value: string) => {
    setDateFrom(value)
    setPage(1)
  }

  const handleToChange = (value: string) => {
    setDateTo(value)
    setPage(1)
  }

  const { user } = useAuth()
  const roleValue = typeof user?.role === "string" ? user.role : ""
  const role: Role = isRole(roleValue) ? roleValue : "admin-penjualan"
  const perm = permissionOf(role, "sales")
  const isCRUD = perm === "CRUD"

  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState("")

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState("")

  const [isViewOpen, setIsViewOpen] = useState(false)
  const [viewSaleId, setViewSaleId] = useState("")
  const [viewDoc, setViewDoc] = useState<SalesDetailDto["doc"] | null>(null)
  const [viewError, setViewError] = useState("")
  const [isViewLoading, setIsViewLoading] = useState(false)
  const viewRequestIdRef = useRef(0)

  const handleViewOpenChange = useCallback((open: boolean) => {
    setIsViewOpen(open)
    if (!open) {
      viewRequestIdRef.current += 1
      setIsViewLoading(false)
    }
  }, [])

  const handleDeleteOpenChange = useCallback(
    (open: boolean) => {
      if (isCancelling && !open) return
      setIsDeleteOpen(open)
      if (!open) {
        setCancelError("")
        setDeleteSaleId(null)
      }
    },
    [isCancelling]
  )

  const handleExport = async () => {
    if (isExporting) return
    setExportError("")

    if (!selectedBranch.code) {
      setExportError("Cabang tidak valid untuk ekspor.")
      return
    }

    if (!canExport) {
      setExportError(dateRangeError || "Rentang tanggal ekspor tidak valid.")
      return
    }

    setIsExporting(true)
    try {
      await downloadExport({
        branchCode: selectedBranch.code,
        q: normalizedQuery.q,
        status: normalizedQuery.status,
        from: normalizedQuery.from,
        to: normalizedQuery.to,
      })
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Gagal mengekspor data penjualan.")
    } finally {
      setIsExporting(false)
    }
  }

  const openView = useCallback(
    async (saleId: string) => {
      const requestId = viewRequestIdRef.current + 1
      viewRequestIdRef.current = requestId
      const isCurrentRequest = () => requestId === viewRequestIdRef.current

      setViewSaleId(saleId)
      setViewError("")
      setViewDoc(null)
      setIsViewLoading(true)
      setIsViewOpen(true)
      try {
        const detail = await loadSaleDetail(saleId)
        if (!isCurrentRequest()) return
        setViewDoc(detail.doc)
      } catch (err: unknown) {
        if (!isCurrentRequest()) return
        setViewDoc(null)
        setViewError(err instanceof Error ? err.message : "Gagal memuat detail penjualan.")
      } finally {
        if (isCurrentRequest()) {
          setIsViewLoading(false)
        }
      }
    },
    [loadSaleDetail]
  )

  const handleCancel = useCallback(async () => {
    if (!deleteSaleId || isCancelling) return

    setCancelError("")
    setIsCancelling(true)

    try {
      await cancelSale(deleteSaleId)
      setIsDeleteOpen(false)
      setDeleteSaleId(null)
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Gagal membatalkan transaksi.")
    } finally {
      setIsCancelling(false)
    }
  }, [cancelSale, deleteSaleId, isCancelling])

  const handlePrint = useCallback(
    async (saleId: string) => {
      await openPrint(saleId)
    },
    [openPrint]
  )

  const handlePrintNoPrice = useCallback(
    async (saleId: string) => {
      await openPrintNoPrice(saleId)
    },
    [openPrintNoPrice]
  )

  return {
    data: {
      rows: salesData,
      total,
      resolvedPage,
      totalPages,
      listLoading: isLoading,
      listError: loadError,
      filterError: dateRangeError,
      exportDisabled: !canExport || !selectedBranch.code,
      isExporting,
      exportError,
      isCRUD,
      isDeleteOpen,
      isCancelling,
      cancelError,
      isViewOpen,
      viewSaleId,
      viewDoc,
      viewError,
      isViewLoading,
    },
    filters: {
      searchTerm,
      statusFilter,
      dateFrom,
      dateTo,
    },
    actions: {
      setIsViewOpen: handleViewOpenChange,
      setIsDeleteOpen: handleDeleteOpenChange,
      setPage,
      handleSearchChange,
      handleStatusChange,
      handleFromChange,
      handleToChange,
      reloadList: () => void reloadAll(),
      handleExport,
      openView,
      handlePrint,
      handlePrintNoPrice,
      handleCancel,
      selectForCancel: (saleId: string) => {
        setCancelError("")
        setDeleteSaleId(saleId)
        setIsDeleteOpen(true)
      },
      getStatusBadge: getSalesStatusBadge,
      getStatusLabel: getSalesStatusLabel,
    },
  }
}
