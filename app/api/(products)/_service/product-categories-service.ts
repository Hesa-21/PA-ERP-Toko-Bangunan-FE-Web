import {
  addProductCategory,
  deleteProductCategory,
  getProductCategories,
  getProducts,
  updateProductCategory,
} from "@/lib/server/mock-db"
import { getCentralBranchId } from "@/lib/single-branch"

export type ProductCategoryWithUsageDto = {
  id: string
  name: string
  productCount: number
}

export function validateListCategoriesInput(): { ok: true } | { ok: false; error: string } {
  return { ok: true as const }
}

export function listProductCategories() {
  return getProductCategories(getCentralBranchId())
}

export function listProductCategoriesWithUsage(): ProductCategoryWithUsageDto[] {
  const centralBranchId = getCentralBranchId()
  const categories = getProductCategories(centralBranchId)
  const products = getProducts(centralBranchId)

  const countByCategoryId = new Map<string, number>()
  for (const product of products) {
    const categoryId = (product.categoryId ?? "").trim()
    if (!categoryId) continue
    countByCategoryId.set(categoryId, (countByCategoryId.get(categoryId) ?? 0) + 1)
  }

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    productCount: countByCategoryId.get(category.id) ?? 0,
  }))
}

export function validateCreateCategoryInput(input: { name: string }) {
  if (!input.name) return { ok: false as const, error: "Nama kategori wajib." }
  return { ok: true as const }
}

export function createProductCategory(input: { name: string }) {
  return addProductCategory({
    branchId: getCentralBranchId(),
    name: input.name,
  })
}

export function validateUpdateCategoryInput(input: { id: string; name: string }) {
  if (!input.id) return { ok: false as const, error: "id wajib." }
  if (!input.name) return { ok: false as const, error: "Nama kategori wajib." }
  return { ok: true as const }
}

export function editProductCategory(input: { id: string; name: string }) {
  return updateProductCategory({
    branchId: getCentralBranchId(),
    id: input.id,
    name: input.name,
  })
}

export function validateDeleteCategoryInput(input: { id: string }) {
  if (!input.id) return { ok: false as const, error: "id wajib." }
  return { ok: true as const }
}

export function removeProductCategory(input: { id: string }) {
  deleteProductCategory({
    branchId: getCentralBranchId(),
    id: input.id,
  })
}
