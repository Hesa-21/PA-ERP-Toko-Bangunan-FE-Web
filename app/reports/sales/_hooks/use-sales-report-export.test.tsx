import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useSalesReportExport } from "@/app/reports/sales/_hooks/use-sales-report-export"
import * as SalesReportApi from "@/app/reports/sales/_api-clients/sales-report"

describe("useSalesReportExport integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("returns export result and resets exporting state", async () => {
    vi.spyOn(SalesReportApi, "exportSalesReport").mockResolvedValue({
      blob: new Blob(["ok"], { type: "text/csv" }),
      filename: "laporan.csv",
    })

    const { result } = renderHook(() =>
      useSalesReportExport({
        branchId: "branch-a",
        branchCode: "cabang-a",
      })
    )

    let exportResult: Awaited<ReturnType<typeof result.current.exportReport>>

    await act(async () => {
      exportResult = await result.current.exportReport(
        {
          from: "2026-03-01",
          to: "2026-03-08",
          paymentType: "cash",
          view: "period",
        },
        { download: false }
      )
    })

    expect(exportResult!.filename).toBe("laporan.csv")
    expect(result.current.isExporting).toBe(false)
    expect(result.current.exportError).toBe("")
  })

  it("surfaces export error and resets exporting state", async () => {
    vi.spyOn(SalesReportApi, "exportSalesReport").mockRejectedValue(new Error("Export gagal"))

    const { result } = renderHook(() =>
      useSalesReportExport({
        branchId: "branch-a",
        branchCode: "cabang-a",
      })
    )

    let thrown: unknown = null

    await act(async () => {
      try {
        await result.current.exportReport(
          {
            from: "2026-03-01",
            to: "2026-03-08",
            paymentType: "cash",
            view: "period",
          },
          { download: false }
        )
      } catch (error) {
        thrown = error
      }
    })

    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toBe("Export gagal")

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false)
      expect(result.current.exportError).toBe("Export gagal")
    })
  })
})
