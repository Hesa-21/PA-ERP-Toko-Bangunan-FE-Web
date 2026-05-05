import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as posSalesController from "@/app/api/(pos)/_controller/pos-sales-controller"
import * as posSalesRoute from "@/app/api/(pos)/pos/sales/route"

vi.mock("@/app/api/(pos)/_controller/pos-sales-controller", () => ({
  handlePosSalesPost: vi.fn(),
}))

describe("pos sales route delegation", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("delegates POST route to controller", async () => {
    vi.mocked(posSalesController.handlePosSalesPost).mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 201 })
    )

    const request = new Request("https://example.com/api/pos/sales", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ branch: "b_1", items: [{ sku: "SKU-1", quantity: 1 }] }),
    })

    await posSalesRoute.POST(request)

    expect(posSalesController.handlePosSalesPost).toHaveBeenCalledWith(request)
  })
})