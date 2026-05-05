import { afterEach, describe, expect, it, vi } from "vitest"
import * as mockDb from "@/lib/server/mock-db"
import {
  listProductZoneBalances,
  validateProductZoneBalancesQuery,
} from "@/app/api/(products)/_service/product-zone-balances-service"
import type { ProductZoneBalancesGetQuery } from "@/app/api/(products)/_lib/query-contracts"

const baseQuery: ProductZoneBalancesGetQuery = {
  sku: "",
  hasLimit: true,
  limit: 2,
  page: 1,
  invalidPageParam: false,
  invalidLimitParam: false,
}

const sampleRows = [
  { sku: "SKU-1", totalNormalQty: 5, isMultiZone: false, primaryPickWarehouseId: "z-1", lines: [] },
  { sku: "SKU-2", totalNormalQty: 4, isMultiZone: false, primaryPickWarehouseId: "z-1", lines: [] },
  { sku: "SKU-3", totalNormalQty: 3, isMultiZone: false, primaryPickWarehouseId: "z-2", lines: [] },
  { sku: "SKU-4", totalNormalQty: 2, isMultiZone: false, primaryPickWarehouseId: "z-2", lines: [] },
  { sku: "SKU-5", totalNormalQty: 1, isMultiZone: false, primaryPickWarehouseId: "z-3", lines: [] },
]

describe("product zone balances service", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects invalid pagination query", () => {
    const valid = validateProductZoneBalancesQuery({
      ...baseQuery,
      invalidLimitParam: true,
    })

    expect(valid.ok).toBe(false)
    if (valid.ok) return

    expect(valid.error).toContain("limit")
  })

  it("paginates list response when sku filter is empty", () => {
    const spy = vi.spyOn(mockDb, "getProductZoneBalances").mockReturnValue(sampleRows as never)

    const result = listProductZoneBalances({
      ...baseQuery,
      page: 2,
      limit: 2,
    })

    expect(spy).toHaveBeenCalledWith({ branchId: "b_1", sku: undefined })
    expect(result.total).toBe(5)
    expect(result.page).toBe(2)
    expect(result.limit).toBe(2)
    expect(result.hasMore).toBe(true)
    expect(result.items.map((item) => item.sku)).toEqual(["SKU-3", "SKU-4"])
  })

  it("returns single-sku response without pagination slicing", () => {
    const spy = vi.spyOn(mockDb, "getProductZoneBalances").mockReturnValue(sampleRows.slice(0, 1) as never)

    const result = listProductZoneBalances({
      ...baseQuery,
      sku: "SKU-1",
      page: 4,
      limit: 2,
    })

    expect(spy).toHaveBeenCalledWith({ branchId: "b_1", sku: "SKU-1" })
    expect(result.page).toBe(1)
    expect(result.hasMore).toBe(false)
    expect(result.items.map((item) => item.sku)).toEqual(["SKU-1"])
  })
})
