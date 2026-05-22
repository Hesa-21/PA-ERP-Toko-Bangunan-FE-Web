import { afterEach, describe, expect, it, vi } from "vitest"
import * as categoriesService from "@/app/api/(products)/_service/product-categories-service"
import { fetchProductsInitialSnapshot } from "@/app/products/_lib/products-server-snapshot"

describe("products server snapshot", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("builds minimal snapshot from service layer", () => {
    const categories = [{ id: "cat-1", name: "Semen", productCount: 2 }]
    const categoriesSpy = vi
      .spyOn(categoriesService, "listProductCategoriesWithUsage")
      .mockReturnValue(categories as never)

    const result = fetchProductsInitialSnapshot()

    expect(categoriesSpy).toHaveBeenCalledWith()
    expect(result).toEqual({
      categories,
    })
    expect("products" in (result as Record<string, unknown>)).toBe(false)
  })
})