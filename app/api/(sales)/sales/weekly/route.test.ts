import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as salesAnalyticsController from "@/app/api/(sales)/_controller/sales-analytics-controller"
import { GET } from "@/app/api/(sales)/sales/weekly/route"

describe("sales weekly route", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates GET to weekly controller", async () => {
    const request = new Request("https://example.com/api/sales/weekly?branch=b_1")
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(salesAnalyticsController, "handleSalesWeeklyGet").mockResolvedValue(response)

    const result = await GET(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })
})
