import {
  createMasterProduct,
  createProductCategory,
  deleteMasterProduct,
  deleteProductCategory,
  fetchMasterProducts,
  fetchProductCategories,
  updateMasterProduct,
  updateProductCategory,
} from "@/lib/client/master-data-products"
import { apiFetchJson } from "@/lib/client/http"
import type { CategoryDto, PriceTier, ProductDto } from "@/lib/domain"

export type { CategoryDto, PriceTier, ProductDto }

export type ProductCategoryWithUsageDto = CategoryDto & {
  productCount: number
}

export type ProductsListQuery = {
  q?: string
  categoryId?: string
  stockOrder?: "highest" | "lowest"
  retailOrder?: "highest" | "lowest"
  page?: number
  limit?: number
  sortBy?: "name" | "sku" | "category" | "price" | "stock"
  sortDir?: "asc" | "desc"
  priceTier?: PriceTier
  warehouseId?: string
}

export async function productsApiList(input: ProductsListQuery): Promise<{ products: ProductDto[]; total: number }> {
  const qs = new URLSearchParams()

  const q = (input.q ?? "").trim()
  if (q) qs.set("q", q)

  const categoryId = (input.categoryId ?? "").trim()
  if (categoryId) qs.set("categoryId", categoryId)

  if (input.stockOrder === "highest" || input.stockOrder === "lowest") {
    qs.set("stockOrder", input.stockOrder)
  }

  if (input.retailOrder === "highest" || input.retailOrder === "lowest") {
    qs.set("retailOrder", input.retailOrder)
  }

  const hasExplicitPage = typeof input.page === "number" && Number.isFinite(input.page)
  const hasExplicitLimit = typeof input.limit === "number" && Number.isFinite(input.limit)
  if (hasExplicitPage || hasExplicitLimit) {
    const pageRaw = hasExplicitPage ? Number(input.page) : 1
    const page = Math.max(1, Math.trunc(pageRaw))
    qs.set("page", String(page))

    const limitRaw = hasExplicitLimit ? Number(input.limit) : 20
    const limit = Math.max(1, Math.min(100, Math.trunc(limitRaw)))
    qs.set("limit", String(limit))
  }

  if (input.sortBy) qs.set("sortBy", input.sortBy)
  if (input.sortDir) qs.set("sortDir", input.sortDir)
  if (input.priceTier) qs.set("priceTier", input.priceTier)

  const warehouseId = (input.warehouseId ?? "").trim()
  if (warehouseId) qs.set("warehouseId", warehouseId)

  const data = await apiFetchJson<{ products?: ProductDto[]; total?: number }>(
    `/api/products?${qs.toString()}`,
    { method: "GET" },
    { defaultErrorMessage: "Gagal memuat produk" }
  )

  return {
    products: Array.isArray(data.products) ? data.products : [],
    total: Number.isFinite(data.total) ? Number(data.total) : 0,
  }
}

export async function productsApiListCategoriesWithUsage(input: {
  includeUsage?: boolean
}): Promise<ProductCategoryWithUsageDto[]> {
  const qs = new URLSearchParams()
  if (input.includeUsage !== false) qs.set("includeUsage", "1")

  const data = await apiFetchJson<{ categories?: Array<CategoryDto & { productCount?: number }> }>(
    `/api/product-categories${qs.toString() ? `?${qs.toString()}` : ""}`,
    { method: "GET" },
    { defaultErrorMessage: "Gagal memuat kategori" }
  )

  if (!Array.isArray(data.categories)) return []

  return data.categories.map((category) => ({
    id: category.id,
    name: category.name,
    productCount: Math.max(0, Math.trunc(Number(category.productCount ?? 0) || 0)),
  }))
}

export const productsApiListAll = fetchMasterProducts
export const productsApiCreate = createMasterProduct
export const productsApiUpdate = updateMasterProduct
export const productsApiDelete = deleteMasterProduct
export const productsApiListCategories = fetchProductCategories
export const productsApiCreateCategory = createProductCategory
export const productsApiUpdateCategory = updateProductCategory
export const productsApiDeleteCategory = deleteProductCategory
