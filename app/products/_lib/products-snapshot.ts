import type { ProductCategoryWithUsageDto, WarehouseZoneDto } from "@/app/products/_api-clients/products"
import type { ZoneStocksDto } from "@/lib/domain"

export type ProductsInitialSnapshot = {
  categories: ProductCategoryWithUsageDto[]
  zones: WarehouseZoneDto[]
  zoneStocks: ZoneStocksDto
  defaultWarehouseId: string
}
