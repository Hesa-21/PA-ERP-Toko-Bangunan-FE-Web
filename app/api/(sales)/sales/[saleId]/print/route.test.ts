import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as salesPrintController from "@/app/api/(sales)/_controller/sales-print-controller"
import { GET } from "@/app/api/(sales)/sales/[saleId]/print/route"

describe("sale detail print route", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates GET to print controller with route saleId and withPrice=true", async () => {
    const request = new Request("https://example.com/api/sales/S-1/print?branch=b_1")
    const ctx = { params: Promise.resolve({ saleId: "S-1" }) }
    const response = new NextResponse("html", { status: 200 })
    const spy = vi.spyOn(salesPrintController, "handleSalesPrintGet").mockResolvedValue(response)

    const result = await GET(request, ctx)

    expect(spy).toHaveBeenCalledWith(request, { saleId: "S-1", withPrice: true })
    expect(result).toBe(response)
  })
})
