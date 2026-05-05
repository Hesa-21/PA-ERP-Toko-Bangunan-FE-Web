import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useSalesReportData } from "@/app/reports/sales/_hooks/use-sales-report-data"
import * as SalesReportApi from "@/app/reports/sales/_api-clients/sales-report"
import type { SalesReportListResponseDto } from "@/app/reports/sales/_api-clients/sales-report.types"
import { mapSalesReportTableModel } from "@/app/reports/sales/_lib/sales-report-models"

describe("useSalesReportData integration", () => {
  const stableQuery = {
    branchId: "branch-a",
    from: "2026-03-01",
    to: "2026-03-08",
    paymentType: "cash" as const,
    view: "period" as const,
    page: 1,
    limit: 20,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("loads rows and exposes ready data state", async () => {
    vi.spyOn(SalesReportApi, "listSalesReport").mockResolvedValue({
      items: [
        {
          invoiceNo: "INV-1",
          transactionDate: "2026-03-01",
          customerName: "PT Maju",
          supplierName: "CV Batu",
          paymentTypeLabel: "cash",
          totalAmount: 100000,
          paidAmount: 100000,
          remainingAmount: 0,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })

    const { result } = renderHook(() =>
      useSalesReportData({
        query: stableQuery,
        enabled: true,
      })
    )

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true)
    })

    expect(result.current.error).toBe("")
    expect(result.current.table?.rows.length).toBe(1)
    expect(result.current.isEmpty).toBe(false)
  })

  it("surfaces api errors as hook error state", async () => {
    vi.spyOn(SalesReportApi, "listSalesReport").mockRejectedValue(new Error("Boom"))

    const { result } = renderHook(() =>
      useSalesReportData({
        query: stableQuery,
        enabled: true,
      })
    )

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true)
      expect(result.current.error).toBe("Boom")
    })
  })

  it("keeps loaded state during manual refetch", async () => {
    let resolveRefetch: ((value: Awaited<ReturnType<typeof SalesReportApi.listSalesReport>>) => void) | null = null

    const listSpy = vi.spyOn(SalesReportApi, "listSalesReport")
      .mockResolvedValueOnce({
        items: [
          {
            invoiceNo: "INV-1",
            transactionDate: "2026-03-01",
            customerName: "PT Maju",
            supplierName: "CV Batu",
            paymentTypeLabel: "cash",
            totalAmount: 100000,
            paidAmount: 100000,
            remainingAmount: 0,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      })
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveRefetch = resolve
        })
      )

    const nextResponse: SalesReportListResponseDto = {
      items: [
        {
          invoiceNo: "INV-2",
          transactionDate: "2026-03-02",
          customerName: "PT Baru",
          supplierName: "CV Semen",
          paymentTypeLabel: "credit",
          totalAmount: 250000,
          paidAmount: 100000,
          remainingAmount: 150000,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    }

    const { result } = renderHook(() =>
      useSalesReportData({
        query: stableQuery,
        enabled: true,
      })
    )

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true)
      expect(result.current.table?.rows[0]?.invoiceNo).toBe("INV-1")
    })

    let refetchPromise!: Promise<void>

    act(() => {
      refetchPromise = result.current.refetch()
    })

    expect(result.current.isFetching).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.table?.rows[0]?.invoiceNo).toBe("INV-1")

    await act(async () => {
      resolveRefetch?.(nextResponse)
      await refetchPromise
    })

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false)
      expect(result.current.table?.rows[0]?.invoiceNo).toBe("INV-2")
    })

    expect(listSpy).toHaveBeenCalledTimes(2)
  })

  it("clamps mapped page into available total pages", () => {
    const model = mapSalesReportTableModel({
      items: [],
      total: 15,
      page: 99,
      limit: 10,
    })

    expect(model.totalPages).toBe(2)
    expect(model.page).toBe(2)
  })
})
