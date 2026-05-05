import { afterEach, describe, expect, it, vi } from "vitest"
import * as salesAuth from "@/app/api/(sales)/_lib/auth"
import * as salesListService from "@/app/api/(sales)/_service/sales-list-service"
import * as salesAnalyticsService from "@/app/api/(sales)/_service/sales-analytics-service"
import * as salesExportService from "@/app/api/(sales)/_service/sales-export-service"
import { handleSalesGet } from "@/app/api/(sales)/_controller/sales-controller"
import { handleSalesSummaryGet } from "@/app/api/(sales)/_controller/sales-analytics-controller"
import { handleSalesExportGet } from "@/app/api/(sales)/_controller/sales-export-controller"

function createAllowedGuard() {
  return {
    ok: true as const,
    data: {
      user: {
        id: "user-1",
        name: "Sales Reader",
        role: "super-admin",
        branch: "cabang-a",
      },
      session: {
        provider: "jwt",
        user: {
          id: "user-1",
          name: "Sales Reader",
          role: "super-admin",
          branch: "cabang-a",
        },
      },
    },
  }
}

describe("sales read controllers", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects invalid list query before branch access check", async () => {
    vi.spyOn(salesAuth, "requireSalesReadGuard").mockReturnValue(createAllowedGuard() as never)

    const ensureSpy = vi.spyOn(salesAuth, "ensureSalesBranchAccess")
    const listSpy = vi.spyOn(salesListService, "listSalesMonitoring")

    const response = await handleSalesGet(
      new Request("https://example.com/api/sales?branch=b_1&status=invalid")
    )

    expect(response.status).toBe(400)
    expect(ensureSpy).not.toHaveBeenCalled()
    expect(listSpy).not.toHaveBeenCalled()
  })

  it("returns paged sales payload with hardened defaults", async () => {
    vi.spyOn(salesAuth, "requireSalesReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(salesAuth, "ensureSalesBranchAccess").mockReturnValue(null)

    const listSpy = vi.spyOn(salesListService, "listSalesMonitoring").mockReturnValue({
      items: [
        {
          id: "S-1",
          date: "01/04/2026",
          customer: "Walk-in",
          items: 1,
          total: 100,
          paid: 100,
          remaining: 0,
          status: "Paid",
          paymentMethod: "Tunai",
          dueDate: "-",
          salesperson: "Sales A",
        },
      ],
      total: 1,
      page: 1,
      limit: 5,
    })

    const response = await handleSalesGet(
      new Request("https://example.com/api/sales?branch=b_1")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: "b_1",
        pageRaw: 1,
        limitRaw: 5,
        invalidPageParam: false,
        invalidLimitParam: false,
      })
    )

    const payload = (await response.json()) as {
      total?: number
      page?: number
      limit?: number
    }

    expect(payload.total).toBe(1)
    expect(payload.page).toBe(1)
    expect(payload.limit).toBe(5)
  })

  it("rejects invalid summary scope", async () => {
    vi.spyOn(salesAuth, "requireSalesReadGuard").mockReturnValue(createAllowedGuard() as never)

    const ensureSpy = vi.spyOn(salesAuth, "ensureSalesBranchAccess")
    const summarySpy = vi.spyOn(salesAnalyticsService, "buildSalesSummary")

    const response = await handleSalesSummaryGet(
      new Request("https://example.com/api/sales/summary?branch=b_1&scope=weekly")
    )

    expect(response.status).toBe(400)
    expect(ensureSpy).not.toHaveBeenCalled()
    expect(summarySpy).not.toHaveBeenCalled()
  })

  it("rejects invalid export date format", async () => {
    vi.spyOn(salesAuth, "requireSalesReadGuard").mockReturnValue(createAllowedGuard() as never)

    const ensureSpy = vi.spyOn(salesAuth, "ensureSalesBranchAccess")
    const exportSpy = vi.spyOn(salesExportService, "buildSalesExportCsv")

    const response = await handleSalesExportGet(
      new Request("https://example.com/api/sales/export?branch=b_1&from=abc&to=2026-04-01")
    )

    expect(response.status).toBe(400)
    expect(ensureSpy).not.toHaveBeenCalled()
    expect(exportSpy).not.toHaveBeenCalled()
  })
})