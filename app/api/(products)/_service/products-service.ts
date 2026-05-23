import {
  addProduct,
  deleteProduct,
  getProductCategories,
  getProducts,
  getStockProducts,
  updateProduct,
} from "@/lib/server/mock-db"
import type { PriceTier } from "@/lib/domain"
import { getCentralBranchId } from "@/lib/single-branch"
import type { ProductsGetQuery } from "@/app/api/(products)/_lib/query-contracts"

export function validateProductsQuery(input: ProductsGetQuery) {
  if (input.invalidPageParam) return { ok: false as const, error: "page tidak valid." }
  if (input.invalidLimitParam) return { ok: false as const, error: "limit tidak valid." }
  if (input.invalidSortByParam) return { ok: false as const, error: "sortBy tidak valid." }
  if (input.invalidSortDirParam) return { ok: false as const, error: "sortDir tidak valid." }
  if (input.invalidPriceTierParam) return { ok: false as const, error: "priceTier tidak valid." }
  if (input.categoryId) {
    const validCategoryIds = new Set(getProductCategories(getCentralBranchId()).map((c) => c.id))
    if (!validCategoryIds.has(input.categoryId)) {
      return { ok: false as const, error: "categoryId tidak valid." }
    }
  }

  if (input.stockOrderRaw && !input.stockOrder) {
    return { ok: false as const, error: "stockOrder tidak valid." }
  }

  if (input.retailOrderRaw && !input.retailOrder) {
    return { ok: false as const, error: "retailOrder tidak valid." }
  }

  return { ok: true as const }
}

export function listProducts(input: ProductsGetQuery) {
  const centralBranchId = getCentralBranchId()
  const masterProductsAll = getProducts(centralBranchId)
  const categoryNameById = new Map(getProductCategories(centralBranchId).map((c) => [c.id, c.name] as const))

  const applyCategory = (items: typeof masterProductsAll) => {
    if (!input.categoryId) return items
    return items.filter((p) => (p.categoryId ?? "").trim() === input.categoryId)
  }

  const filtered = (() => {
    if (input.skuExact) {
      const key = input.skuExact.toLowerCase()
      return applyCategory(masterProductsAll.filter((p) => p.sku.toLowerCase() === key))
    }

    if (input.q) {
      const key = input.q.toLowerCase()
      return applyCategory(
        masterProductsAll.filter((p) => p.sku.toLowerCase().includes(key) || p.name.toLowerCase().includes(key))
      )
    }

    return applyCategory(masterProductsAll)
  })()

  const total = filtered.length

  const stockProducts = getStockProducts(centralBranchId, input.warehouseId)
  const stockBySku = new Map(stockProducts.map((p) => [p.sku.toLowerCase(), p.stock]))

  const productsWithStock = filtered.map((p) => ({
    ...p,
    stock: stockBySku.get(p.sku.toLowerCase()) ?? 0,
  }))

  const collator = new Intl.Collator("id")
  const dir = input.sortDir === "desc" ? -1 : 1
  const tier = input.priceTier === "partai" || input.priceTier === "cabang" ? input.priceTier : "retail"
  type ProductRow = (typeof productsWithStock)[number]

  const categoryLabelOf = (product: ProductRow) => {
    const categoryId = (product.categoryId ?? "").trim()
    if (!categoryId) return String(product.category ?? "")
    return categoryNameById.get(categoryId) ?? String(product.category ?? "")
  }

  const compareByNameThenSku = (a: ProductRow, b: ProductRow) => collator.compare(a.name, b.name) || collator.compare(a.sku, b.sku)

  const compareStock = (a: ProductRow, b: ProductRow, direction: "asc" | "desc") => {
    const diff = Number(a.stock ?? 0) - Number(b.stock ?? 0)
    return direction === "desc" ? -diff : diff
  }

  const compareRetailPrice = (a: ProductRow, b: ProductRow, direction: "asc" | "desc") => {
    const diff = Number(a.prices?.retail ?? 0) - Number(b.prices?.retail ?? 0)
    return direction === "desc" ? -diff : diff
  }

  const sorted = [...productsWithStock].sort((a, b) => {
    if (input.retailOrder === "highest" || input.retailOrder === "lowest") {
      const retailCmp = compareRetailPrice(a, b, input.retailOrder === "highest" ? "desc" : "asc")
      if (retailCmp !== 0) return retailCmp
    }

    if (input.stockOrder === "highest" || input.stockOrder === "lowest") {
      const stockCmp = compareStock(a, b, input.stockOrder === "highest" ? "desc" : "asc")
      if (stockCmp !== 0) return stockCmp
    }

    let primary = 0
    switch (input.sortBy) {
      case "sku":
        primary = collator.compare(a.sku, b.sku) * dir
        break
      case "category":
        primary = collator.compare(categoryLabelOf(a), categoryLabelOf(b)) * dir
        break
      case "price":
        primary = (Number(a.prices?.[tier] ?? 0) - Number(b.prices?.[tier] ?? 0)) * dir
        break
      case "stock":
        primary = (Number(a.stock ?? 0) - Number(b.stock ?? 0)) * dir
        break
      case "name":
      default:
        primary = collator.compare(a.name, b.name) * dir
        break
    }

    if (primary !== 0) return primary
    return compareByNameThenSku(a, b)
  })

  const products = input.hasLimit ? sorted.slice((input.page - 1) * input.limit, (input.page - 1) * input.limit + input.limit) : sorted

  return { products, total }
}

export function validateCreateProductInput(input: {
  sku: string
  name: string
  prices: Partial<Record<PriceTier, number>>
  stockQuantity: number
  hpp: number
}) {
  if (!input.sku) return { ok: false as const, error: "SKU wajib." }
  if (!input.name) return { ok: false as const, error: "Nama produk wajib." }

  const retail = Number(input.prices.retail ?? Number.NaN)
  const partai = Number(input.prices.partai ?? Number.NaN)
  const cabang = Number(input.prices.cabang ?? Number.NaN)

  if (![retail, partai, cabang].every((n) => Number.isFinite(n) && n >= 0)) {
    return { ok: false as const, error: "Harga retail/partai/cabang wajib diisi (>= 0)." }
  }

  if (!Number.isFinite(input.hpp) || input.hpp < 0) {
    return { ok: false as const, error: "HPP wajib diisi (>= 0)." }
  }

  if (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0) {
    return { ok: false as const, error: "Kuantitas stok wajib diisi (bilangan bulat >= 0)." }
  }

  return {
    ok: true as const,
    prices: { retail, partai, cabang },
  }
}

export function createProduct(input: {
  sku: string
  name: string
  categoryId?: string
  prices: Record<PriceTier, number>
  hpp: number
  stockQuantity: number
}) {
  return addProduct({
    ...input,
    branchId: getCentralBranchId(),
  })
}

export function validateUpdateProductInput(input: {
  sku: string
  prices: Partial<Record<PriceTier, number>>
  stockQuantity?: number
  hpp?: number
}) {
  if (!input.sku) return { ok: false as const, error: "SKU wajib." }

  const retail = input.prices.retail !== undefined ? Number(input.prices.retail) : undefined
  const partai = input.prices.partai !== undefined ? Number(input.prices.partai) : undefined
  const cabang = input.prices.cabang !== undefined ? Number(input.prices.cabang) : undefined

  if ([retail, partai, cabang].some((n) => n !== undefined && (!Number.isFinite(n) || n < 0))) {
    return { ok: false as const, error: "Harga harus angka >= 0." }
  }

  if (input.hpp !== undefined && (!Number.isFinite(input.hpp) || input.hpp < 0)) {
    return { ok: false as const, error: "HPP harus angka >= 0." }
  }

  if (input.stockQuantity !== undefined && (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0)) {
    return { ok: false as const, error: "Kuantitas stok harus bilangan bulat >= 0." }
  }

  return { ok: true as const, prices: { retail, partai, cabang } }
}

export function editProduct(input: {
  sku: string
  name?: string
  categoryId?: string
  prices?: Partial<Record<PriceTier, number>>
  hpp?: number
  stockQuantity?: number
}) {
  return updateProduct({
    ...input,
    branchId: getCentralBranchId(),
  })
}

export function validateDeleteProductInput(input: { sku: string }) {
  if (!input.sku) return { ok: false as const, error: "SKU wajib." }
  return { ok: true as const }
}

export function removeProduct(input: { sku: string }) {
  deleteProduct({
    branchId: getCentralBranchId(),
    sku: input.sku,
  })
}
