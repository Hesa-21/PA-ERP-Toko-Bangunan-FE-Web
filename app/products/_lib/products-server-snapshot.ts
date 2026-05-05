import "server-only"

import { listProductCategoriesWithUsage } from "@/app/api/(products)/_service/product-categories-service"
import {
  getDefaultWarehouseZoneId,
  getWarehouse,
  getWarehouseZoneStockSummary,
} from "@/lib/server/mock-db"
import { getCentralBranchId } from "@/lib/single-branch"
import type { ProductsInitialSnapshot } from "@/app/products/_lib/products-snapshot"

export function fetchProductsInitialSnapshot(): ProductsInitialSnapshot {
  const centralBranchId = getCentralBranchId()
  const categories = listProductCategoriesWithUsage()
  const warehouse = getWarehouse(centralBranchId)
  const zoneStocks = getWarehouseZoneStockSummary(centralBranchId)
  const defaultWarehouseId = getDefaultWarehouseZoneId(centralBranchId)

  return {
    categories,
    zones: warehouse.zones,
    zoneStocks,
    defaultWarehouseId,
  }
}
