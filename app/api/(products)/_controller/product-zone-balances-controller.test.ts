import { afterEach, describe, expect, it, vi } from "vitest"
import * as productsAuth from "@/app/api/(products)/_lib/auth"
import * as zoneBalanceService from "@/app/api/(products)/_service/product-zone-balances-service"
import { handleProductZoneBalancesGet } from "@/app/api/(products)/_controller/product-zone-balances-controller"

function createAllowedGuard() {
  return {
    ok: true as const,
    data: {
      user: {
        id: "user-1",
        name: "Gudang",
        role: "super-admin",
        branch: "cabang-a",
      },
      session: {
        provider: "jwt",
        user: {
          id: "user-1",
          name: "Gudang",
          role: "super-admin",
          branch: "cabang-a",
        },
      },
    },
  }
}

describe("product zone balances controller", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects invalid limit query", async () => {
    vi.spyOn(productsAuth, "requireProductZoneBalancesReadGuard").mockReturnValue(createAllowedGuard() as never)
    const branchSpy = vi.spyOn(productsAuth, "ensureBranchAccess")
    const listSpy = vi.spyOn(zoneBalanceService, "listProductZoneBalances")

    const response = await handleProductZoneBalancesGet(
      new Request("https://example.com/api/products/zone-balances?branch=b_1&limit=-10")
    )

    expect(response.status).toBe(400)
    expect(branchSpy).not.toHaveBeenCalled()
    expect(listSpy).not.toHaveBeenCalled()

    const payload = (await response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toContain("limit")
  })

  it("returns paged zone balances payload", async () => {
    vi.spyOn(productsAuth, "requireProductZoneBalancesReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(null)

    const listSpy = vi.spyOn(zoneBalanceService, "listProductZoneBalances").mockReturnValue({
      items: [
        { sku: "SKU-1", totalNormalQty: 10, isMultiZone: false, primaryPickWarehouseId: "z-1", lines: [] },
      ],
      total: 1,
      page: 1,
      limit: 200,
      hasMore: false,
    })

    const response = await handleProductZoneBalancesGet(
      new Request("https://example.com/api/products/zone-balances?branch=b_1")
    )

    expect(response.status).toBe(200)
    expect(listSpy).toHaveBeenCalledTimes(1)

    const payload = (await response.json()) as {
      items?: Array<{ sku?: string }>
      total?: number
      page?: number
      limit?: number
      hasMore?: boolean
    }

    expect(payload.total).toBe(1)
    expect(payload.page).toBe(1)
    expect(payload.limit).toBe(200)
    expect(payload.hasMore).toBe(false)
    expect(payload.items?.[0]?.sku).toBe("SKU-1")
  })
})
