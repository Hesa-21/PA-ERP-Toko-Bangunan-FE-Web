import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as salesExportController from "@/app/api/(sales)/_controller/sales-export-controller"
import { GET } from "@/app/api/(sales)/sales/export/route"

describe("sales export route", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates GET to export controller", async () => {
    const request = new Request("https://example.com/api/sales/export?branch=b_1")
    const response = new NextResponse("csv", { status: 200 })
    const spy = vi.spyOn(salesExportController, "handleSalesExportGet").mockResolvedValue(response)

    const result = await GET(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })
})
