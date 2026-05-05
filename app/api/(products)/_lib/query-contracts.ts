export type OrderQuery = "highest" | "lowest" | ""

export type ProductsGetQuery = {
  warehouseId?: string
  q: string
  skuExact: string
  categoryId: string
  stockOrderRaw: string
  retailOrderRaw: string
  stockOrder: OrderQuery
  retailOrder: OrderQuery
  sortBy: string
  sortDir: string
  priceTier: string
  hasLimit: boolean
  limit: number
  page: number
  invalidPageParam: boolean
  invalidLimitParam: boolean
  invalidSortByParam: boolean
  invalidSortDirParam: boolean
  invalidPriceTierParam: boolean
}

export type ProductZoneBalancesGetQuery = {
  sku: string
  hasLimit: boolean
  limit: number
  page: number
  invalidPageParam: boolean
  invalidLimitParam: boolean
}