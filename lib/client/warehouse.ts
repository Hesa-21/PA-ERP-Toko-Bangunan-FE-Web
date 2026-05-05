import { apiFetchJson, type ApiFetchJsonOptions } from "@/lib/client/http"
import type { WarehouseZoneDto, ZoneStockLineDto, ZoneStocksDto } from "@/lib/domain/warehouse"

export type { WarehouseZoneDto, ZoneStockLineDto, ZoneStocksDto } from "@/lib/domain/warehouse"

export type StockMovementTypeDto = "Masuk" | "Keluar" | "Pindah"

export type StockMovementDto = {
  id: string
  date: string
  time: string
  item: string
  type: StockMovementTypeDto
  quantity: number
  fromLocation: string
  toLocation: string
  operator: string

  sourceDocumentType?: string
  sourceDocumentId?: string

  reason?: string
  note?: string

  status?: "POSTED" | "VOID"
  voidedAt?: string
  voidedBy?: string
  voidReason?: string
}

export type ZoneStockPageDto = {
  items: ZoneStockLineDto[]
  total: number
  page: number
  limit: number
}

export type WarehouseMovementsPageDto = {
  items: StockMovementDto[]
  total: number
  page: number
  limit: number
}

export type WarehouseSnapshotDto = {
  zones: WarehouseZoneDto[]
  movements: StockMovementDto[]
  zoneStocks: ZoneStocksDto
  defaultWarehouseId: string
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
}

function normalizePage(page: unknown): number | undefined {
  if (typeof page !== "number" || !Number.isFinite(page)) return undefined
  return Math.max(1, Math.trunc(page))
}

function normalizeLimit(limit: unknown): number | undefined {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return undefined
  return Math.max(1, Math.min(100, Math.trunc(limit)))
}

function createWarehouseMutationIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `warehouse-mut-${crypto.randomUUID()}`
  }

  const random = Math.random().toString(36).slice(2)
  return `warehouse-mut-${Date.now()}-${random}`
}

export async function fetchWarehouseSnapshot(
  input: { includeMovements?: boolean },
  opts?: { signal?: AbortSignal }
): Promise<WarehouseSnapshotDto> {
  const qs = new URLSearchParams()
  if (input.includeMovements === false) {
    qs.set("includeMovements", "0")
  }

  const data = await apiFetchJson<{
    zones?: WarehouseZoneDto[]
    movements?: StockMovementDto[]
    zoneStocks?: ZoneStocksDto
    defaultWarehouseId?: string
  }>(
    `/api/warehouse?${qs.toString()}`,
    { method: "GET", signal: opts?.signal },
    { defaultErrorMessage: "Gagal memuat gudang" }
  )

  const zoneStocks = asRecord(data?.zoneStocks)
  return {
    zones: asArray<WarehouseZoneDto>(data?.zones),
    movements: asArray<StockMovementDto>(data?.movements),
    zoneStocks: zoneStocks as ZoneStocksDto,
    defaultWarehouseId: String(data?.defaultWarehouseId ?? "").trim(),
  }
}

export async function fetchWarehouseZoneStocks(input: {
  zoneId: string
  q?: string
  page?: number
  limit?: number
}): Promise<ZoneStockPageDto> {
  const qs = new URLSearchParams({
    zoneId: input.zoneId,
  })
  const q = String(input.q ?? "").trim()
  if (q) qs.set("q", q)
  const page = normalizePage(input.page)
  if (typeof page === "number") qs.set("page", String(page))
  const limit = normalizeLimit(input.limit)
  if (typeof limit === "number") qs.set("limit", String(limit))

  const data = await apiFetchJson<ZoneStockPageDto>(
    `/api/warehouse/zone-stocks?${qs.toString()}`,
    { method: "GET" },
    { defaultErrorMessage: "Gagal memuat stok zona" }
  )

  return {
    items: asArray<ZoneStockLineDto>(data?.items),
    total: Number(data?.total ?? 0) || 0,
    page: Number(data?.page ?? 1) || 1,
    limit: Number(data?.limit ?? 5) || 5,
  }
}

export async function fetchWarehouseMovements(input: {
  page?: number
  limit?: number
}): Promise<WarehouseMovementsPageDto> {
  const qs = new URLSearchParams()
  const page = normalizePage(input.page)
  if (typeof page === "number") qs.set("page", String(page))
  const limit = normalizeLimit(input.limit)
  if (typeof limit === "number") qs.set("limit", String(limit))

  const data = await apiFetchJson<WarehouseMovementsPageDto>(
    `/api/warehouse/movements?${qs.toString()}`,
    { method: "GET" },
    { defaultErrorMessage: "Gagal memuat pergerakan stok" }
  )

  return {
    items: asArray<StockMovementDto>(data?.items),
    total: Number(data?.total ?? 0) || 0,
    page: Number(data?.page ?? 1) || 1,
    limit: Number(data?.limit ?? 5) || 5,
  }
}

export async function createWarehouseZone(input: {
  name: string
  status?: "Aktif" | "Maintenance"
}): Promise<WarehouseZoneDto | null> {
  const data = await apiFetchJson<{ zone?: WarehouseZoneDto }>(
    "/api/warehouse/zones",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createWarehouseMutationIdempotencyKey(),
      },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal menambah zona" }
  )

  return data?.zone ?? null
}

export async function updateWarehouseZone(input: {
  zoneId: string
  name?: string
  status?: "Aktif" | "Maintenance"
}): Promise<WarehouseZoneDto | null> {
  const data = await apiFetchJson<{ zone?: WarehouseZoneDto }>(
    "/api/warehouse/zones",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createWarehouseMutationIdempotencyKey(),
      },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal mengupdate zona" }
  )

  return data?.zone ?? null
}

export async function deleteWarehouseZone(input: { zoneId: string }): Promise<void> {
  const qs = new URLSearchParams({ zoneId: input.zoneId })
  await apiFetchJson(
    `/api/warehouse/zones?${qs.toString()}`,
    {
      method: "DELETE",
      headers: {
        "Idempotency-Key": createWarehouseMutationIdempotencyKey(),
      },
    },
    { defaultErrorMessage: "Gagal menghapus zona" }
  )
}

export type PostWarehouseMovementInput = {
  item: string
  type: "Masuk" | "Keluar" | "Pindah"
  quantity: number
  fromLocation: string
  toLocation: string

  reason?: string
  note?: string
}

export type PostWarehouseMovementResult = {
  movement?: unknown
  newEntries?: unknown
}

export async function postWarehouseMovement(
  input: PostWarehouseMovementInput,
  options?: ApiFetchJsonOptions
): Promise<PostWarehouseMovementResult> {
  return apiFetchJson<PostWarehouseMovementResult>(
    "/api/warehouse/movements",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createWarehouseMutationIdempotencyKey(),
      },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: options?.defaultErrorMessage || "Gagal mencatat pergerakan" }
  )
}

export type PostStockVarianceInput = {
  warehouseId: string
  sku: string
  mode: "add" | "reduce"
  quantity: number
  reason: string
  note?: string
}

export type PostStockVarianceResult = {
  doc?: unknown
  newEntries?: unknown
}

export async function postStockVariance(
  input: PostStockVarianceInput,
  options?: ApiFetchJsonOptions
): Promise<PostStockVarianceResult> {
  return apiFetchJson<PostStockVarianceResult>(
    "/api/warehouse/stock-variance",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createWarehouseMutationIdempotencyKey(),
      },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: options?.defaultErrorMessage || "Gagal koreksi selisih fisik" }
  )
}
