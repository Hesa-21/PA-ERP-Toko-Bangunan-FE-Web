import "server-only"

import { listProductCategoriesWithUsage } from "@/app/api/(products)/_service/product-categories-service"
import type { ProductsInitialSnapshot } from "@/app/products/_lib/products-snapshot"

export function fetchProductsInitialSnapshot(): ProductsInitialSnapshot {
  const categories = listProductCategoriesWithUsage()

  return {
    categories,
  }
}
