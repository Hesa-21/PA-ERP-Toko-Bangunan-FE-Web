import { describe, expect, it } from "vitest"
import { listProductCategoriesWithUsage } from "@/app/api/(products)/_service/product-categories-service"
import { getProductCategories, getProducts } from "@/lib/server/mock-db"

describe("products category usage service", () => {
  it("returns category usage counts aligned with current products data", () => {
    const branchId = "b_1"

    const categories = getProductCategories(branchId)
    const products = getProducts(branchId)
    const expectedCountByCategoryId = new Map<string, number>()

    for (const product of products) {
      const categoryId = (product.categoryId ?? "").trim()
      if (!categoryId) continue
      expectedCountByCategoryId.set(categoryId, (expectedCountByCategoryId.get(categoryId) ?? 0) + 1)
    }

    const usage = listProductCategoriesWithUsage()

    expect(usage.length).toBe(categories.length)
    for (const row of usage) {
      expect(row.productCount).toBe(expectedCountByCategoryId.get(row.id) ?? 0)
    }
  })
})
