import { apiFetchJson, apiPostJson } from "@/lib/client/http"
import { fetchProductCategories } from "@/lib/client/master-data-products"
import type { CategoryDto, ProductDto } from "@/lib/domain/master-data-products"
import type { PriceTier } from "@/lib/domain/types"
import type { PosPaymentStatus } from "@/lib/domain/pos"

export type PosProductDto = ProductDto

export type PosProductZoneBalanceLineDto = {
  zoneId: string
  zoneName: string
  normalQty: number
}

export type PosProductZoneBalanceDto = {
  sku: string
  totalNormalQty: number
  isMultiZone: boolean
  primaryPickWarehouseId?: string
  lines: PosProductZoneBalanceLineDto[]
}

export type PosWarehouseZoneDto = {
  id: string
  name: string
}

export type PosWarehouseZoneStockLineDto = {
  sku: string
  name?: string
  normalQty: number
  damagedQty: number
  expiredQty: number
  totalQty: number
}

export type PosWarehouseZoneStockSummaryDto = Record<string, PosWarehouseZoneStockLineDto[]>

export type PosSalesDocumentDto = {
  id: string
  postedAt?: string
  customerName?: string
  customerAddress?: string
  customerPhone?: string
  items: Array<{
    sku: string
    quantity: number
    unitPrice: number
    discount: number
  }>
  orderDiscount: number
}

export type PosSaleComputedTotalsDto = {
  subtotal: number
  perItemDiscountTotal: number
  subtotalAfterItemDiscount: number
  orderDiscountApplied: number
  grandTotal: number
}

const inFlightPosProducts = new Map<string, Promise<{ products: PosProductDto[]; total: number }>>()
const posProductsCache = new Map<string, { ts: number; data: { products: PosProductDto[]; total: number } }>()
const POS_PRODUCTS_CACHE_TTL_MS = 1500
const POS_PRODUCTS_CACHE_MAX_ENTRIES = 120
const POS_ZONE_BALANCES_PAGE_LIMIT = 200
const POS_ZONE_BALANCES_MAX_PAGES = 25

function createPosSalesIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pos-sales-${crypto.randomUUID()}`
  }

  const random = Math.random().toString(36).slice(2)
  return `pos-sales-${Date.now()}-${random}`
}

function prunePosProductsCache(now: number) {
  for (const [key, entry] of posProductsCache.entries()) {
    if (now - entry.ts >= POS_PRODUCTS_CACHE_TTL_MS) {
      posProductsCache.delete(key)
    }
  }

  if (posProductsCache.size <= POS_PRODUCTS_CACHE_MAX_ENTRIES) return

  const entries = [...posProductsCache.entries()]
  entries.sort((a, b) => a[1].ts - b[1].ts)
  const overflow = entries.length - POS_PRODUCTS_CACHE_MAX_ENTRIES
  for (let i = 0; i < overflow; i += 1) {
    const key = entries[i]?.[0]
    if (!key) continue
    posProductsCache.delete(key)
  }
}

function writePosProductsCache(url: string, data: { products: PosProductDto[]; total: number }) {
  const now = Date.now()
  posProductsCache.set(url, { ts: now, data })
  prunePosProductsCache(now)
}

export type { CategoryDto }

export async function fetchPosZonesApi() {
  const balances = await fetchPosProductZoneBalancesApi({})

  const zonesById = new Map<string, PosWarehouseZoneDto>()
  const zoneStocks: PosWarehouseZoneStockSummaryDto = {}

  for (const balance of balances.items ?? []) {
    const sku = String(balance?.sku ?? "").trim()
    if (!sku) continue

    for (const line of balance.lines ?? []) {
      const zoneId = String(line?.zoneId ?? "").trim()
      if (!zoneId) continue

      const zoneName = String(line?.zoneName ?? "").trim() || zoneId
      if (!zonesById.has(zoneId)) {
        zonesById.set(zoneId, { id: zoneId, name: zoneName })
      }

      const normalQty = Math.max(0, Math.trunc(Number(line?.normalQty ?? 0)))
      if (normalQty <= 0) continue

      if (!zoneStocks[zoneId]) zoneStocks[zoneId] = []
      zoneStocks[zoneId].push({
        sku,
        normalQty,
        damagedQty: 0,
        expiredQty: 0,
        totalQty: normalQty,
      })
    }
  }

  for (const lines of Object.values(zoneStocks)) {
    lines.sort((a, b) => a.sku.localeCompare(b.sku, "id"))
  }

  const zones = Array.from(zonesById.values()).sort(
    (a, b) => a.name.localeCompare(b.name, "id") || a.id.localeCompare(b.id, "id")
  )

  return {
    zones,
    defaultWarehouseId: zones[0]?.id ?? "",
    zoneStocks,
  }
}

export async function fetchPosProductsApi(input: {
  warehouseId?: string
  q?: string
  sku?: string
  categoryId?: string
  category?: string
  page?: number
  limit?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
  priceTier?: PriceTier
  signal?: AbortSignal
}) {
  const qs = new URLSearchParams()
  const wid = (input.warehouseId ?? "").trim()
  if (wid) qs.set("warehouseId", wid)

  const q = (input.q ?? "").trim()
  if (q) qs.set("q", q)

  const sku = (input.sku ?? "").trim()
  if (sku) qs.set("sku", sku)

  const categoryId = (input.categoryId ?? input.category ?? "").trim()
  if (categoryId) qs.set("categoryId", categoryId)

  if (typeof input.page === "number" && Number.isFinite(input.page)) {
    const page = Math.max(1, Math.trunc(input.page))
    qs.set("page", String(page))
  }

  const sortBy = (input.sortBy ?? "").trim()
  if (sortBy) qs.set("sortBy", sortBy)

  const sortDir = (input.sortDir ?? "").trim()
  if (sortDir) qs.set("sortDir", sortDir)

  const priceTier = (input.priceTier ?? "").trim()
  if (priceTier) qs.set("priceTier", priceTier)

  if (typeof input.limit === "number" && Number.isFinite(input.limit)) {
    const limit = Math.max(1, Math.min(100, Math.trunc(input.limit)))
    qs.set("limit", String(limit))
  }

  const parse = (payload: { products?: ProductDto[]; total?: number }) => ({
    products: Array.isArray(payload.products) ? payload.products : [],
    total: typeof payload.total === "number" && Number.isFinite(payload.total) ? Math.max(0, Math.trunc(payload.total)) : 0,
  })

  const url = `/api/products?${qs.toString()}`
  const now = Date.now()
  prunePosProductsCache(now)
  const cached = posProductsCache.get(url)
  if (cached && now - cached.ts < POS_PRODUCTS_CACHE_TTL_MS) {
    return cached.data
  }

  if (input.signal) {
    const immediate = await apiFetchJson<{ products?: ProductDto[]; total?: number }>(
      url,
      { method: "GET", signal: input.signal },
      { defaultErrorMessage: "Gagal memuat data POS" }
    )
    const data = parse(immediate)
    writePosProductsCache(url, data)
    return data
  }

  const inFlight = inFlightPosProducts.get(url)
  if (inFlight) return inFlight

  const promise = apiFetchJson<{ products?: ProductDto[]; total?: number }>(
    url,
    { method: "GET" },
    { defaultErrorMessage: "Gagal memuat data POS" }
  )
    .then((payload) => {
      const data = parse(payload)
      writePosProductsCache(url, data)
      return data
    })
    .finally(() => {
      inFlightPosProducts.delete(url)
    })

  inFlightPosProducts.set(url, promise)
  return promise
}

export async function fetchPosProductZoneBalancesApi(input: {
  sku?: string
}) {
  const sku = (input.sku ?? "").trim()

  type ZoneBalancesPagePayload = {
    items?: PosProductZoneBalanceDto[]
    hasMore?: boolean
  }

  if (sku) {
    const qs = new URLSearchParams({
      sku,
      page: "1",
      limit: "1",
    })

    const data = await apiFetchJson<ZoneBalancesPagePayload>(
      `/api/products/zone-balances?${qs.toString()}`,
      { method: "GET" },
      { defaultErrorMessage: "Gagal memuat peta stok per zona" }
    )

    return {
      items: Array.isArray(data?.items) ? data.items : [],
    }
  }

  const collected: PosProductZoneBalanceDto[] = []
  const seenSku = new Set<string>()

  for (let page = 1; page <= POS_ZONE_BALANCES_MAX_PAGES; page += 1) {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(POS_ZONE_BALANCES_PAGE_LIMIT),
    })

    const data = await apiFetchJson<ZoneBalancesPagePayload>(
      `/api/products/zone-balances?${qs.toString()}`,
      { method: "GET" },
      { defaultErrorMessage: "Gagal memuat peta stok per zona" }
    )

    const pageItems = Array.isArray(data?.items) ? data.items : []
    for (const item of pageItems) {
      const skuKey = String(item?.sku ?? "").trim().toLowerCase()
      if (!skuKey || seenSku.has(skuKey)) continue
      seenSku.add(skuKey)
      collected.push(item)
    }

    if (!(data?.hasMore === true) || pageItems.length === 0) break
  }

  return { items: collected }
}

export async function postPosSaleApi(input: {
  warehouseId?: string
  allowNegativeStock: boolean
  salespersonName: string
  paymentStatus: PosPaymentStatus
  paidAmount: number
  dueDate?: string
  orderDiscount: number
  customerName: string
  customerAddress: string
  customerPhone?: string
  items: Array<{
    sku: string
    quantity: number
    unitPrice: number
    discount: number
    priceTier: PriceTier
    warehouseId?: string
  }>
}) {
  return apiPostJson<
    { doc?: PosSalesDocumentDto; computed?: PosSaleComputedTotalsDto },
    {
      allowNegativeStock: boolean
      warehouseId?: string
      salespersonName: string
      paymentStatus: PosPaymentStatus
      paidAmount: number
      dueDate?: string
      orderDiscount: number
      customerName: string
      customerAddress: string
      customerPhone?: string
      items: Array<{
        sku: string
        quantity: number
        unitPrice: number
        discount: number
        priceTier: PriceTier
        warehouseId?: string
      }>
    }
  >(
    "/api/pos/sales",
    {
      allowNegativeStock: input.allowNegativeStock,
      warehouseId: input.warehouseId,
      salespersonName: input.salespersonName,
      paymentStatus: input.paymentStatus,
      paidAmount: input.paidAmount,
      dueDate: input.dueDate,
      orderDiscount: input.orderDiscount,
      customerName: input.customerName,
      customerAddress: input.customerAddress,
      customerPhone: input.customerPhone,
      items: input.items,
    },
    {
      headers: {
        "Idempotency-Key": createPosSalesIdempotencyKey(),
      },
    },
    { defaultErrorMessage: "Gagal memproses transaksi" }
  )
}

export async function fetchProductCategoriesApi() {
  return fetchProductCategories()
}
