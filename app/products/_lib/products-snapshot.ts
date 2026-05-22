import type { ProductCategoryWithUsageDto } from "@/app/products/_api-clients/products"

export type ProductsInitialSnapshot = {
  categories: ProductCategoryWithUsageDto[]
}
