"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActiveBranch } from "@/hooks/use-active-branch"
import {
  SALES_REPORT_DEFAULT_FILTERS,
  type SalesPaymentType,
  type SalesReportFilterModel,
  type SalesReportUiState,
  type SalesReportViewKey,
} from "@/app/reports/sales/_lib/sales-report-ui-contract"
import {
  validateSalesReportRange,
} from "@/app/reports/sales/_lib/sales-report-front-contract"
import { useSalesReportData } from "@/app/reports/sales/_hooks/use-sales-report-data"
import { useSalesReportExport } from "@/app/reports/sales/_hooks/use-sales-report-export"

const PAGE_SIZE = 20

const URL_PARAM_FROM = "from"
const URL_PARAM_TO = "to"
const URL_PARAM_PAYMENT = "payment"
const URL_PARAM_VIEW = "view"
const URL_PARAM_PAGE = "page"

function normalizePaymentType(paymentType: SalesPaymentType): "cash" | "credit" | "" {
  if (paymentType === "cash") return "cash"
  if (paymentType === "credit") return "credit"
  return ""
}

function parsePaymentTypeParam(raw: string): SalesPaymentType {
  const value = raw.trim().toLowerCase()
  if (value === "cash") return "cash"
  if (value === "credit") return "credit"
  return "all"
}

function parseViewParam(raw: string): SalesReportViewKey {
  const value = raw.trim().toLowerCase()
  if (value === "customer") return "customer"
  if (value === "supplier") return "supplier"
  return "period"
}

function parsePositiveIntParam(raw: string, fallback = 1): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.max(1, Math.trunc(parsed))
}

function areFiltersEqual(a: SalesReportFilterModel, b: SalesReportFilterModel): boolean {
  return (
    a.periodFrom === b.periodFrom &&
    a.periodTo === b.periodTo &&
    a.paymentType === b.paymentType
  )
}

export function useSalesReportController() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { selectedBranch } = useActiveBranch()
  const didInitFromUrlRef = useRef(false)

  const [filters, setFilters] = useState<SalesReportFilterModel>(SALES_REPORT_DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<SalesReportFilterModel>(SALES_REPORT_DEFAULT_FILTERS)
  const [activeView, setActiveView] = useState<SalesReportViewKey>("period")
  const [page, setPage] = useState(1)
  const [hasApplied, setHasApplied] = useState(false)
  const [validationError, setValidationError] = useState("")

  useEffect(() => {
    const urlFrom = (searchParams.get(URL_PARAM_FROM) ?? "").trim()
    const urlTo = (searchParams.get(URL_PARAM_TO) ?? "").trim()
    const paymentType = parsePaymentTypeParam(searchParams.get(URL_PARAM_PAYMENT) ?? "")
    const view = parseViewParam(searchParams.get(URL_PARAM_VIEW) ?? "")
    const pageFromUrl = parsePositiveIntParam(searchParams.get(URL_PARAM_PAGE) ?? "", 1)

    const hasValidUrlRange = validateSalesReportRange(urlFrom, urlTo)
    const nextApplied: SalesReportFilterModel = hasValidUrlRange
      ? {
        ...SALES_REPORT_DEFAULT_FILTERS,
        periodFrom: urlFrom,
        periodTo: urlTo,
        paymentType,
      }
      : SALES_REPORT_DEFAULT_FILTERS

    if (!areFiltersEqual(appliedFilters, nextApplied)) setAppliedFilters(nextApplied)
    if (!areFiltersEqual(filters, nextApplied)) setFilters(nextApplied)
    if (activeView !== view) setActiveView(view)

    const nextPage = hasValidUrlRange ? pageFromUrl : 1
    if (page !== nextPage) setPage(nextPage)
    if (hasApplied !== hasValidUrlRange) setHasApplied(hasValidUrlRange)
    if (validationError) setValidationError("")

    didInitFromUrlRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!didInitFromUrlRef.current) return

    const params = new URLSearchParams(searchParams.toString())
    const hasValidAppliedRange = hasApplied && validateSalesReportRange(appliedFilters.periodFrom, appliedFilters.periodTo)

    if (hasValidAppliedRange) {
      params.set(URL_PARAM_FROM, appliedFilters.periodFrom)
      params.set(URL_PARAM_TO, appliedFilters.periodTo)

      if (appliedFilters.paymentType !== "all") {
        params.set(URL_PARAM_PAYMENT, appliedFilters.paymentType)
      } else {
        params.delete(URL_PARAM_PAYMENT)
      }

      if (page > 1) {
        params.set(URL_PARAM_PAGE, String(page))
      } else {
        params.delete(URL_PARAM_PAGE)
      }
    } else {
      params.delete(URL_PARAM_FROM)
      params.delete(URL_PARAM_TO)
      params.delete(URL_PARAM_PAYMENT)
      params.delete(URL_PARAM_PAGE)
    }

    if (activeView !== "period") {
      params.set(URL_PARAM_VIEW, activeView)
    } else {
      params.delete(URL_PARAM_VIEW)
    }

    const nextQs = params.toString()
    const currentQs = searchParams.toString()
    if (nextQs === currentQs) return

    const href = nextQs ? `${pathname}?${nextQs}` : pathname
    router.replace(href, { scroll: false })
  }, [activeView, appliedFilters.paymentType, appliedFilters.periodFrom, appliedFilters.periodTo, hasApplied, page, pathname, router, searchParams])

  const branchId = selectedBranch.id
  const branchCode = selectedBranch.code

  const canQueryData =
    !!branchId &&
    hasApplied &&
    validateSalesReportRange(appliedFilters.periodFrom, appliedFilters.periodTo)

  const query = useMemo(
    () => ({
      branchId,
      from: appliedFilters.periodFrom,
      to: appliedFilters.periodTo,
      paymentType: normalizePaymentType(appliedFilters.paymentType),
      view: activeView,
      page,
      limit: PAGE_SIZE,
    }),
    [activeView, appliedFilters.paymentType, appliedFilters.periodFrom, appliedFilters.periodTo, branchId, page]
  )

  const dataHook = useSalesReportData({ query, enabled: canQueryData })
  const exportHook = useSalesReportExport({ branchId, branchCode })

  useEffect(() => {
    const totalPages = dataHook.table?.totalPages
    if (!hasApplied || !totalPages) return
    if (page <= totalPages) return
    setPage(totalPages)
  }, [dataHook.table?.totalPages, hasApplied, page])

  const uiState: SalesReportUiState = useMemo(() => {
    if (validationError) return "error"
    if (!hasApplied) return "initial"
    if (dataHook.error) return "error"
    if (dataHook.isLoading && !dataHook.hasLoaded) return "loading"
    if (dataHook.isEmpty) return "empty"
    return "ready"
  }, [dataHook.error, dataHook.hasLoaded, dataHook.isEmpty, dataHook.isLoading, hasApplied, validationError])

  const applyFilters = useCallback(async () => {
    if (!branchId) {
      setValidationError("Cabang aktif belum tersedia.")
      return
    }

    if (!validateSalesReportRange(filters.periodFrom, filters.periodTo)) {
      setValidationError("Rentang tanggal tidak valid. Pastikan Periode Dari <= Periode Sampai.")
      return
    }

    setValidationError("")
    setPage(1)
    setAppliedFilters({ ...filters })
    setHasApplied(true)
  }, [branchId, filters])

  const resetFilters = useCallback(() => {
    setFilters(SALES_REPORT_DEFAULT_FILTERS)
    setAppliedFilters(SALES_REPORT_DEFAULT_FILTERS)
    setHasApplied(false)
    setPage(1)
    setActiveView("period")
    setValidationError("")
    dataHook.cancel()
  }, [dataHook])

  const changeView = useCallback((view: SalesReportViewKey) => {
    setActiveView(view)
    setPage(1)
  }, [])

  const changePage = useCallback((nextPage: number) => {
    const totalPages = dataHook.table?.totalPages ?? 1
    const normalizedNext = Number.isFinite(nextPage) ? Math.floor(nextPage) : 1
    const safeNext = Math.min(totalPages, Math.max(1, normalizedNext))
    setPage(safeNext)
  }, [dataHook.table?.totalPages])

  const exportCurrentReport = useCallback(async () => {
    if (!hasApplied) {
      setValidationError("Terapkan filter terlebih dahulu sebelum ekspor.")
      return
    }

    const source = appliedFilters
    if (!validateSalesReportRange(source.periodFrom, source.periodTo)) {
      setValidationError("Rentang tanggal tidak valid untuk ekspor.")
      return
    }

    setValidationError("")

    await exportHook.exportReport({
      from: source.periodFrom,
      to: source.periodTo,
      paymentType: normalizePaymentType(source.paymentType),
      view: activeView,
    })
  }, [activeView, appliedFilters, exportHook, hasApplied])

  return {
    data: {
      rows: dataHook.table?.rows ?? [],
      total: dataHook.table?.total ?? 0,
      page: dataHook.table?.page ?? page,
      totalPages: dataHook.table?.totalPages ?? 1,
      uiState,
      isLoading: dataHook.isLoading,
      isFetching: dataHook.isFetching,
      isRefreshing: dataHook.isFetching && dataHook.hasLoaded,
      isEmpty: dataHook.isEmpty,
      error: validationError || dataHook.error,
      exportError: exportHook.exportError,
      hasApplied,
      isExporting: exportHook.isExporting,
    },
    filters: {
      draft: filters,
      applied: appliedFilters,
      activeView,
    },
    actions: {
      setFilters,
      applyFilters,
      resetFilters,
      setView: changeView,
      setPage: changePage,
      refetch: dataHook.refetch,
      cancelFetch: dataHook.cancel,
      exportReport: exportCurrentReport,
      cancelExport: exportHook.cancelExport,
    },
  }
}
