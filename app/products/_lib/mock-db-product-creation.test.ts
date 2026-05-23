import { afterEach, describe, expect, it, vi } from "vitest"
import * as singleBranch from "@/lib/single-branch"
import { addProduct, getWarehouse } from "@/lib/server/mock-db"

describe("mock db product creation", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("allows adding a product even when no warehouse zones exist", () => {
    const branchId = "branch-no-zones-test"
    vi.spyOn(singleBranch, "getBranchById").mockReturnValue({
      id: branchId,
      code: "test",
      name: "Test Branch",
    } as never)

    const warehouseBefore = getWarehouse(branchId)
    expect(warehouseBefore.zones).toHaveLength(0)

    const product = addProduct({
      branchId,
      sku: "TEST-PROD-001",
      name: "Produk Uji",
      prices: {
        retail: 1000,
        partai: 900,
        cabang: 800,
      },
      hpp: 500,
      stockQuantity: 12,
    })

    expect(product.sku).toBe("TEST-PROD-001")
    expect(product.stock).toBe(12)
    expect(getWarehouse(branchId).zones).toHaveLength(0)
  })
})