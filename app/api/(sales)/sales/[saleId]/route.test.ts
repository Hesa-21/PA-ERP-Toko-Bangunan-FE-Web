import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as salesController from "@/app/api/(sales)/_controller/sales-controller"
import { DELETE, GET } from "@/app/api/(sales)/sales/[saleId]/route"

describe("sale detail route", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates GET to sale detail controller", async () => {
    const request = new Request("https://example.com/api/sales/S-1?branch=b_1")
    const ctx = { params: Promise.resolve({ saleId: "S-1" }) }
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(salesController, "handleSaleDetailGet").mockResolvedValue(response)

    const result = await GET(request, ctx)

    expect(spy).toHaveBeenCalledWith(request, ctx)
    expect(result).toBe(response)
  })

  it("delegates DELETE to sale detail controller", async () => {
    const request = new Request("https://example.com/api/sales/S-1?branch=b_1", { method: "DELETE" })
    const ctx = { params: Promise.resolve({ saleId: "S-1" }) }
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(salesController, "handleSaleDetailDelete").mockResolvedValue(response)

    const result = await DELETE(request, ctx)

    expect(spy).toHaveBeenCalledWith(request, ctx)
    expect(result).toBe(response)
  })
})
