import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiRequestError } from "@/lib/client/http"
import { exportSalesReport, listSalesReport } from "@/app/reports/sales/_api-clients/sales-report"

describe("sales-report api client contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("maps list endpoint response into DTO with query contract", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    )

    const result = await listSalesReport({
      branchId: "branch-a",
      from: "2026-03-01",
      to: "2026-03-08",
      paymentType: "cash",
      view: "period",
      page: 1,
      limit: 20,
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url] = fetchSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/reports/sales?")
    expect(result.total).toBe(1)
    expect(result.items[0]?.invoiceNo).toBe("INV-1")
  })

  it("returns ApiRequestError when export endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Forbidden" } }), {
        status: 403,
        headers: { "content-type": "application/json" },
      })
    )

    await expect(
      exportSalesReport({
        branchId: "branch-a",
        branchCode: "cabang-a",
        from: "2026-03-01",
        to: "2026-03-08",
        paymentType: "cash",
        view: "period",
      })
    ).rejects.toBeInstanceOf(ApiRequestError)
  })
})
