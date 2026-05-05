import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as salesController from "@/app/api/(sales)/_controller/sales-controller"
import { GET } from "@/app/api/(sales)/sales/route"

describe("sales route", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates GET to sales controller", async () => {
    const request = new Request("https://example.com/api/sales?branch=b_1")
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(salesController, "handleSalesGet").mockResolvedValue(response)

    const result = await GET(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })
})
