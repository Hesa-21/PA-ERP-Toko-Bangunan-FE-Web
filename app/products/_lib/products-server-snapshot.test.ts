import { afterEach, describe, expect, it, vi } from "vitest"
import * as categoriesService from "@/app/api/(products)/_service/product-categories-service"
import * as mockDb from "@/lib/server/mock-db"
import { fetchProductsInitialSnapshot } from "@/app/products/_lib/products-server-snapshot"

describe("products server snapshot", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("builds minimal snapshot from service layer", () => {
    const categories = [{ id: "cat-1", name: "Semen", productCount: 2 }]
    const warehouseData = {
      zones: [{ id: "z-1", name: "Zona A", active: true }],
      movements: [],
    }
    const zoneStocks = {
      "z-1": [{ sku: "SMN-001", normalQty: 10, damagedQty: 0, expiredQty: 0, totalQty: 10 }],
    }

    const categoriesSpy = vi
      .spyOn(categoriesService, "listProductCategoriesWithUsage")
      .mockReturnValue(categories as never)
    const warehouseSpy = vi.spyOn(mockDb, "getWarehouse").mockReturnValue(warehouseData as never)
    const zoneStocksSpy = vi.spyOn(mockDb, "getWarehouseZoneStockSummary").mockReturnValue(zoneStocks as never)
    const defaultWarehouseSpy = vi.spyOn(mockDb, "getDefaultWarehouseZoneId").mockReturnValue("z-1")

    const result = fetchProductsInitialSnapshot()

    expect(categoriesSpy).toHaveBeenCalledWith()
    expect(warehouseSpy).toHaveBeenCalledTimes(1)
    expect(zoneStocksSpy).toHaveBeenCalledTimes(1)
    expect(defaultWarehouseSpy).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      categories,
      zones: warehouseData.zones,
      zoneStocks,
      defaultWarehouseId: "z-1",
    })
    expect("products" in (result as Record<string, unknown>)).toBe(false)
  })
})