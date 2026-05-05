import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as salesPrintController from "@/app/api/(sales)/_controller/sales-print-controller"
import { GET } from "@/app/api/(sales)/sales/print-no-price/route"

describe("sales print-no-price route", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates GET to print controller with withPrice=false", async () => {
    const request = new Request("https://example.com/api/sales/print-no-price?branch=b_1&saleId=S-1")
    const response = new NextResponse("html", { status: 200 })
    const spy = vi.spyOn(salesPrintController, "handleSalesPrintGet").mockResolvedValue(response)

    const result = await GET(request)

    expect(spy).toHaveBeenCalledWith(request, { withPrice: false })
    expect(result).toBe(response)
  })
})
