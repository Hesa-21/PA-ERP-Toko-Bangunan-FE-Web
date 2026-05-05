import { describe, expect, it } from "vitest"
import { buildVisibleProductPages } from "@/app/products/_lib/products-pagination"

describe("products-pagination", () => {
  it("returns all pages when total pages fit in window", () => {
    expect(buildVisibleProductPages({ page: 2, totalPages: 4, windowSize: 5 })).toEqual([1, 2, 3, 4])
  })

  it("returns centered window for middle pages", () => {
    expect(buildVisibleProductPages({ page: 6, totalPages: 12, windowSize: 5 })).toEqual([4, 5, 6, 7, 8])
  })

  it("clamps output near bounds", () => {
    expect(buildVisibleProductPages({ page: 1, totalPages: 10, windowSize: 5 })).toEqual([1, 2, 3, 4, 5])
    expect(buildVisibleProductPages({ page: 10, totalPages: 10, windowSize: 5 })).toEqual([6, 7, 8, 9, 10])
  })
})
