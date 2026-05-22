import { apiFetchJson } from "@/lib/client/http"
import type { CategoryDto, PriceTier, ProductDto } from "@/lib/domain"

export type { CategoryDto, PriceTier, ProductDto } from "@/lib/domain"


export async function fetchMasterProducts(
  opts?: { signal?: AbortSignal }
): Promise<ProductDto[]> {
  const qs = new URLSearchParams()
  const data = await apiFetchJson<{ products?: ProductDto[] }>(
    `/api/products${qs.toString() ? `?${qs.toString()}` : ""}`,
    { method: "GET", signal: opts?.signal },
    { defaultErrorMessage: "Gagal memuat produk" }
  )
  return Array.isArray(data.products) ? data.products : []
}

export async function searchProducts(input: {
  q: string
  limit?: number
}, opts?: { signal?: AbortSignal }): Promise<ProductDto[]> {
  const qs = new URLSearchParams()
  const q = (input.q ?? "").trim()
  if (q) qs.set("q", q)

  const limitRaw = typeof input.limit === "number" && Number.isFinite(input.limit) ? input.limit : 20
  const limit = Math.max(1, Math.min(100, Math.trunc(limitRaw)))
  qs.set("limit", String(limit))

  const data = await apiFetchJson<{ products?: ProductDto[] }>(
    `/api/products?${qs.toString()}`,
    { method: "GET", signal: opts?.signal },
    { defaultErrorMessage: "Gagal mencari produk" }
  )
  return Array.isArray(data.products) ? data.products : []
}

export async function fetchProductBySku(input: {
  sku: string
}, opts?: { signal?: AbortSignal }): Promise<ProductDto | null> {
  const clean = (input.sku ?? "").trim()
  if (!clean) return null

  const qs = new URLSearchParams({
    sku: clean,
    limit: "1",
  })

  const data = await apiFetchJson<{ products?: ProductDto[] }>(
    `/api/products?${qs.toString()}`,
    { method: "GET", signal: opts?.signal },
    { defaultErrorMessage: "Gagal memuat produk" }
  )
  const products = Array.isArray(data.products) ? data.products : []
  return products[0] ?? null
}

export async function createMasterProduct(input: {
  sku: string
  name: string
  categoryId?: string
  hpp: number
  prices: Record<PriceTier, number>
}): Promise<void> {
  await apiFetchJson(
    "/api/products",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal menyimpan produk" }
  )
}

export async function updateMasterProduct(input: {
  sku: string
  name: string
  categoryId?: string
  hpp: number
  prices: Record<PriceTier, number>
}): Promise<void> {
  await apiFetchJson(
    "/api/products",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal menyimpan produk" }
  )
}

export async function deleteMasterProduct(input: { sku: string }): Promise<void> {
  await apiFetchJson(
    "/api/products",
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal menghapus produk" }
  )
}

export async function fetchProductCategories(): Promise<CategoryDto[]> {
  const data = await apiFetchJson<{ categories?: CategoryDto[] }>(
    "/api/product-categories",
    { method: "GET" },
    { defaultErrorMessage: "Gagal memuat kategori" }
  )
  return Array.isArray(data.categories) ? data.categories : []
}

export async function createProductCategory(input: { name: string }): Promise<void> {
  await apiFetchJson(
    "/api/product-categories",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal menyimpan kategori" }
  )
}

export async function updateProductCategory(input: { id: string; name: string }): Promise<void> {
  await apiFetchJson(
    "/api/product-categories",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal menyimpan kategori" }
  )
}

export async function deleteProductCategory(input: { id: string }): Promise<void> {
  await apiFetchJson(
    "/api/product-categories",
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal menghapus kategori" }
  )
}

