export const ALL_CATEGORIES_FILTER_VALUE = "__all__"
export const STOCK_ORDER_FILTER_VALUE = "default"
export const STOCK_ORDER_HIGHEST_VALUE = "highest"
export const STOCK_ORDER_LOWEST_VALUE = "lowest"
export const RETAIL_ORDER_FILTER_VALUE = "default"
export const RETAIL_ORDER_HIGHEST_VALUE = "highest"
export const RETAIL_ORDER_LOWEST_VALUE = "lowest"

export type OrderFilter =
  | typeof RETAIL_ORDER_FILTER_VALUE
  | typeof RETAIL_ORDER_HIGHEST_VALUE
  | typeof RETAIL_ORDER_LOWEST_VALUE

export function parseOrderFilterParam(raw: string | null): OrderFilter {
  const normalized = (raw ?? "").trim().toLowerCase()
  if (normalized === "highest") return STOCK_ORDER_HIGHEST_VALUE
  if (normalized === "lowest") return STOCK_ORDER_LOWEST_VALUE
  return STOCK_ORDER_FILTER_VALUE
}

export function toOrderQueryParam(value: OrderFilter): "highest" | "lowest" | undefined {
  if (value === STOCK_ORDER_HIGHEST_VALUE) return "highest"
  if (value === STOCK_ORDER_LOWEST_VALUE) return "lowest"
  return undefined
}

export function isOrderFilterValue(value: string): value is OrderFilter {
  return value === STOCK_ORDER_FILTER_VALUE || value === STOCK_ORDER_HIGHEST_VALUE || value === STOCK_ORDER_LOWEST_VALUE
}
