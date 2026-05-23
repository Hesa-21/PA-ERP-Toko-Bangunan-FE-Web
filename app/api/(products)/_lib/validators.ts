import { z } from "zod"
import type { PriceTier } from "@/lib/domain"
import type {
  OrderQuery,
  ProductZoneBalancesGetQuery,
  ProductsGetQuery,
} from "@/app/api/(products)/_lib/query-contracts"

function normalizeOrderQuery(raw: string): OrderQuery {
  const value = raw.trim().toLowerCase()
  if (value === "highest" || value === "lowest") return value
  return ""
}

export function parseProductsGetQuery(url: URL): ProductsGetQuery {
  const warehouseId = (url.searchParams.get("warehouseId") || "").trim() || undefined
  const q = (url.searchParams.get("q") ?? "").trim()
  const skuExact = (url.searchParams.get("sku") ?? "").trim()
  const categoryId = (url.searchParams.get("categoryId") ?? "").trim()
  const stockOrderRaw = (url.searchParams.get("stockOrder") ?? "").trim()
  const retailOrderRaw = (url.searchParams.get("retailOrder") ?? "").trim()
  const stockOrder = normalizeOrderQuery(stockOrderRaw)
  const retailOrder = normalizeOrderQuery(retailOrderRaw)
  const sortByRaw = (url.searchParams.get("sortBy") ?? "").trim()
  const sortDirRaw = (url.searchParams.get("sortDir") ?? "").trim().toLowerCase()
  const priceTierRaw = (url.searchParams.get("priceTier") ?? "").trim().toLowerCase()
  const allowedSortBy = new Set(["", "name", "sku", "category", "price", "stock"])
  const allowedSortDir = new Set(["", "asc", "desc"])
  const allowedPriceTier = new Set(["", "retail", "partai", "cabang"])

  const invalidSortByParam = !allowedSortBy.has(sortByRaw)
  const invalidSortDirParam = !allowedSortDir.has(sortDirRaw)
  const invalidPriceTierParam = !allowedPriceTier.has(priceTierRaw)

  const sortBy = invalidSortByParam ? "" : sortByRaw
  const sortDir = invalidSortDirParam ? "" : sortDirRaw
  const priceTier = invalidPriceTierParam ? "" : priceTierRaw
  const limitParam = (url.searchParams.get("limit") ?? "").trim()
  const pageParam = (url.searchParams.get("page") ?? "").trim()

  const pageIsInteger = /^[0-9]+$/.test(pageParam)
  const limitIsInteger = /^[0-9]+$/.test(limitParam)
  const limitRaw = limitParam ? Number(limitParam) : Number.NaN
  const invalidLimitParam = Boolean(limitParam) && (!limitIsInteger || !Number.isFinite(limitRaw) || limitRaw <= 0)
  const limit = invalidLimitParam ? 20 : Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.trunc(limitRaw))) : 20
  const hasLimit = Boolean(limitParam)
  const pageRaw = pageParam ? Number(pageParam) : Number.NaN
  const invalidPageParam = Boolean(pageParam) && (!pageIsInteger || !Number.isFinite(pageRaw) || pageRaw <= 0)
  const page = invalidPageParam ? 1 : Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1

  return {
    warehouseId,
    q,
    skuExact,
    categoryId,
    stockOrderRaw,
    retailOrderRaw,
    stockOrder,
    retailOrder,
    sortBy,
    sortDir,
    priceTier,
    hasLimit,
    limit,
    page,
    invalidPageParam,
    invalidLimitParam,
    invalidSortByParam,
    invalidSortDirParam,
    invalidPriceTierParam,
  }
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const bodyBaseSchema = z.object({
})

const finiteNumber = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return Number.NaN
    return Number(trimmed)
  }
  return value
}, z.number().finite())

const pricesSchema = z
  .object({
    retail: finiteNumber.optional(),
    partai: finiteNumber.optional(),
    cabang: finiteNumber.optional(),
  })
  .partial()

const productsBodySchema = bodyBaseSchema.extend({
  sku: z.string().optional(),
  name: z.string().optional(),
  categoryId: z.string().optional(),
  stockQuantity: finiteNumber.optional(),
  prices: pricesSchema.optional(),
  hpp: finiteNumber.optional(),
})

export type ProductsBody = z.infer<typeof productsBodySchema>

export function parseProductsBody(raw: unknown): ParseResult<ProductsBody> {
  const parsed = productsBodySchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: "Payload products tidak valid." }
  }
  return { ok: true, data: parsed.data }
}

const categoryBodySchema = bodyBaseSchema.extend({
  id: z.string().optional(),
  name: z.string().optional(),
})

export type ProductCategoryBody = z.infer<typeof categoryBodySchema>

export function parseProductCategoryBody(raw: unknown): ParseResult<ProductCategoryBody> {
  const parsed = categoryBodySchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: "Payload category tidak valid." }
  }
  return { ok: true, data: parsed.data }
}

export type ProductMutationPayload = {
  sku: string
  name: string
  categoryId?: string
  stockQuantity?: number
  prices: Record<PriceTier, number>
  hpp: number
}

const ZONE_BALANCES_DEFAULT_LIMIT = 200
const ZONE_BALANCES_MAX_LIMIT = 200

export function parseProductZoneBalancesGetQuery(url: URL): ProductZoneBalancesGetQuery {
  const limitParam = (url.searchParams.get("limit") ?? "").trim()
  const pageParam = (url.searchParams.get("page") ?? "").trim()

  const pageIsInteger = /^[0-9]+$/.test(pageParam)
  const limitIsInteger = /^[0-9]+$/.test(limitParam)

  const limitRaw = limitParam ? Number(limitParam) : Number.NaN
  const invalidLimitParam = Boolean(limitParam) && (!limitIsInteger || !Number.isFinite(limitRaw) || limitRaw <= 0)
  const limit = invalidLimitParam
    ? ZONE_BALANCES_DEFAULT_LIMIT
    : Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(ZONE_BALANCES_MAX_LIMIT, Math.trunc(limitRaw)))
      : ZONE_BALANCES_DEFAULT_LIMIT

  const pageRaw = pageParam ? Number(pageParam) : Number.NaN
  const invalidPageParam = Boolean(pageParam) && (!pageIsInteger || !Number.isFinite(pageRaw) || pageRaw <= 0)
  const page = invalidPageParam ? 1 : Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1

  return {
    sku: (url.searchParams.get("sku") ?? "").trim(),
    hasLimit: Boolean(limitParam),
    limit,
    page,
    invalidPageParam,
    invalidLimitParam,
  }
}
