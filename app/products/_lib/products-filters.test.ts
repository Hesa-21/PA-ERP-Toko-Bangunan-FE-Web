import { describe, expect, it } from "vitest"
import {
  isOrderFilterValue,
  parseOrderFilterParam,
  RETAIL_ORDER_FILTER_VALUE,
  STOCK_ORDER_HIGHEST_VALUE,
  STOCK_ORDER_LOWEST_VALUE,
  toOrderQueryParam,
} from "@/app/products/_lib/products-filters"

describe("products-filters", () => {
  it("parses valid order params and falls back to default", () => {
    expect(parseOrderFilterParam("highest")).toBe(STOCK_ORDER_HIGHEST_VALUE)
    expect(parseOrderFilterParam("lowest")).toBe(STOCK_ORDER_LOWEST_VALUE)
    expect(parseOrderFilterParam("invalid-value")).toBe(RETAIL_ORDER_FILTER_VALUE)
    expect(parseOrderFilterParam(null)).toBe(RETAIL_ORDER_FILTER_VALUE)
  })

  it("serializes order filter to query param", () => {
    expect(toOrderQueryParam(STOCK_ORDER_HIGHEST_VALUE)).toBe("highest")
    expect(toOrderQueryParam(STOCK_ORDER_LOWEST_VALUE)).toBe("lowest")
    expect(toOrderQueryParam(RETAIL_ORDER_FILTER_VALUE)).toBeUndefined()
  })

  it("validates accepted order filter values", () => {
    expect(isOrderFilterValue("default")).toBe(true)
    expect(isOrderFilterValue("highest")).toBe(true)
    expect(isOrderFilterValue("lowest")).toBe(true)
    expect(isOrderFilterValue("descending")).toBe(false)
  })
})
