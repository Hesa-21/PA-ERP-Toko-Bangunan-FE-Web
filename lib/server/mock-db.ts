import "server-only"

import { getBranchById, getCentralBranch } from "@/lib/single-branch"
import { type BranchProduct } from "@/lib/domain/master-data-products"
import {
  makeNewMovementId,
  makeNewZoneId,
  type BranchWarehouseData,
  type StockMovement,
  type WarehouseZone,
} from "@/lib/domain/warehouse"
import {
  appendLedger,
  createPurchaseDraft,
  createSalesDraft,
  createStockAdjustmentDraft,
  computePosTotals,
  defaultIdFactory,
  getOnHandQty,
  postPurchaseReceipt,
  createReturnDraft,
  postReturn,
  postSales,
  postStockAdjustment,
  type SalesDocument,
  type StockAdjustmentDocument,
  type StockLedgerEntry,
  type PriceTier,
  type PurchaseDocument,
  type ReturnDocument,
} from "@/lib/domain"
import type { User, UsersListParams, UsersListResponse } from "@/lib/domain/users"
import type { Role } from "@/lib/auth/rbac"
import { getBranchPolicyErrorCode, getPasswordErrorCode, normalizeEmail } from "@/lib/auth/user-validation"
import { hashPassword, needsPasswordRehash, verifyPassword } from "@/lib/auth/password"

function deepClone<T>(value: T): T {
  // structuredClone is available on modern Node runtimes.
  if (typeof structuredClone === "function") return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

function nowIso(): string {
  return new Date().toISOString()
}

function branchIdToCode(branchId: string): string {
  const b = getBranchById(branchId)
  if (!b) throw new Error("BRANCH_NOT_FOUND")
  return b.code
}

function zonePrefixFromBranchCode(code: string): string {
  // cabang-a -> Z-A
  const suffix = code.split("-").pop() ?? code
  return `Z-${suffix.toUpperCase().slice(0, 1)}`
}

function movementPrefixFromBranchCode(code: string): string {
  // cabang-a -> MV-A-
  const suffix = code.split("-").pop() ?? code
  return `MV-${suffix.toUpperCase().slice(0, 1)}-`
}

export type StockProductDto = {
  sku: string
  name: string
  categoryId?: string
  category?: string
  prices: Record<PriceTier, number>
  hpp: number
  stock: number
}

export type MasterProductDto = {
  sku: string
  name: string
  categoryId?: string
  category?: string
  prices: Record<PriceTier, number>
  hpp: number
}

export type ProductCategoryDto = {
  id: string
  name: string
}

type ProductCategory = {
  id: string
  name: string
  createdAt: string
  active?: boolean
}

function normalizeCategoryKey(value: string): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

function makeNewProductCategoryId(state: BranchState): string {
  const numbers = state.categories
    .map((c) => Number(String(c.id).replace(/^CAT-/, "")))
    .filter((n) => Number.isFinite(n))
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1
  return `CAT-${next}`
}

function findActiveCategoryById(state: BranchState, id: string): ProductCategory | undefined {
  const key = (id ?? "").trim()
  if (!key) return undefined
  const found = state.categories.find((c) => c.id === key)
  if (!found) return undefined
  if (found.active === false) return undefined
  return found
}

function ensureCategoryForName(state: BranchState, name: string | undefined): ProductCategory | undefined {
  const raw = (name ?? "").trim().replace(/\s+/g, " ")
  const key = normalizeCategoryKey(raw)
  if (!key) return undefined

  const existing = state.categories.find((c) => normalizeCategoryKey(c.name) === key)
  if (existing) {
    existing.active = true
    // Use canonical name from master list.
    existing.name = (existing.name ?? "").trim().replace(/\s+/g, " ")
    return existing
  }

  const created: ProductCategory = {
    id: makeNewProductCategoryId(state),
    name: raw,
    createdAt: nowIso(),
    active: true,
  }
  state.categories = [created, ...state.categories]
  return created
}

function ensureCategoriesSynced(state: BranchState): void {
  // 1) Deduplicate existing categories by normalized key (keep first occurrence).
  const seen = new Map<string, ProductCategory>()
  const deduped: ProductCategory[] = []
  for (const c of state.categories) {
    const key = normalizeCategoryKey(c.name)
    if (!key) continue
    if (!seen.has(key)) {
      seen.set(key, c)
      deduped.push(c)
    }
  }
  state.categories = deduped

  // 2) Ensure every product has a stable categoryId reference when possible.
  //    (Legacy) If product.category (name) is set but categoryId is missing, map it.
  for (const p of state.products) {
    const categoryId = (p.categoryId ?? "").trim()
    if (categoryId) {
      const found = findActiveCategoryById(state, categoryId)
      if (found) {
        p.categoryId = found.id
        p.category = found.name
        continue
      }
      // Invalid/removed reference -> fall back to name mapping.
      p.categoryId = undefined
    }

    const legacyName = (p.category ?? "").trim().replace(/\s+/g, " ")
    const cat = ensureCategoryForName(state, legacyName || undefined)
    if (!cat) {
      p.categoryId = undefined
      p.category = undefined
      continue
    }

    p.categoryId = cat.id
    p.category = cat.name
  }
}

type BranchState = {
  branchId: string
  branchCode: string

  products: BranchProduct[]
  categories: ProductCategory[]
  ledger: StockLedgerEntry[]
  stockAdjustments: StockAdjustmentDocument[]
  sales: SalesDocument[]

  purchases: PurchaseDocument[]
  returns: ReturnDocument[]

  warehouse: BranchWarehouseData

  // Maps "<SOURCE_TYPE>:<DOC_ID>" -> movement IDs created automatically.
  warehouseMovementLinks: Record<string, string[]>

  // Used by POS and other flows when warehouseId is not specified.
  defaultWarehouseId: string
}

function movementLinkKey(sourceType: string, docId: string): string {
  return `${sourceType}:${docId}`
}

export function postWarehouseTransfer(input: {
  branchId: string
  sku: string
  quantity: number
  fromWarehouseId: string
  toWarehouseId: string
  operator: string

  reason?: string
  note?: string
}): { movement: StockMovement; newEntries: StockLedgerEntry[] } {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)

  const sku = (input.sku ?? "").trim()
  const qty = Math.trunc(Number(input.quantity) || 0)
  const fromId = (input.fromWarehouseId ?? "").trim()
  const toId = (input.toWarehouseId ?? "").trim()

  if (!sku) throw new Error("DOMAIN:INVALID_INPUT:SKU wajib.")
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("DOMAIN:INVALID_INPUT:Quantity harus > 0.")
  if (!fromId) throw new Error("DOMAIN:INVALID_INPUT:fromWarehouseId wajib.")
  if (!toId) throw new Error("DOMAIN:INVALID_INPUT:toWarehouseId wajib.")
  if (fromId === toId) throw new Error("DOMAIN:INVALID_INPUT:Lokasi asal dan tujuan tidak boleh sama.")

  const parsedFrom = parseConditionWarehouseId(fromId)
  const fromIsConditionInZone = Boolean(
    parsedFrom && isZoneId(state, parsedFrom.baseZoneId) && (parsedFrom.condition === "DAMAGED" || parsedFrom.condition === "EXPIRED")
  )

  if (!isZoneId(state, fromId) && !fromIsConditionInZone) {
    throw new Error("DOMAIN:INVALID_INPUT:Lokasi asal harus zona gudang, atau stok rusak/kadaluarsa di zona yang sama.")
  }

  const parsedTo = parseConditionWarehouseId(toId)
  const toIsConditionInSameZone = Boolean(
    parsedTo && isZoneId(state, parsedTo.baseZoneId) && (parsedTo.condition === "DAMAGED" || parsedTo.condition === "EXPIRED")
  )

  // Allowed transfers:
  // - Zone -> Zone
  // - Zone -> Zone::(DAMAGED|EXPIRED) (same base zone)
  // - Zone::(DAMAGED|EXPIRED) -> Zone (same base zone)
  const isZoneToZone = isZoneId(state, fromId) && isZoneId(state, toId)
  const isZoneToCondition = isZoneId(state, fromId) && Boolean(parsedTo && parsedTo.baseZoneId === fromId) && toIsConditionInSameZone
  const isConditionToZone =
    Boolean(parsedFrom && parsedFrom.baseZoneId === toId) && fromIsConditionInZone && isZoneId(state, toId)

  if (!isZoneToZone && !isZoneToCondition && !isConditionToZone) {
    throw new Error(
      "DOMAIN:INVALID_INPUT:Lokasi tujuan harus zona gudang, atau penandaan rusak/kadaluarsa di zona yang sama."
    )
  }

  const onHandFrom = getOnHandQty(state.ledger, {
    branchId: state.branchId,
    sku,
    warehouseId: fromId,
  })

  if (onHandFrom < qty) {
    throw new Error(`DOMAIN:INSUFFICIENT_STOCK:Stok tidak cukup di zona ${fromId}. Tersedia ${onHandFrom}, diminta ${qty}.`)
  }

  const now = nowIso()
  const transferId = `WT-${defaultIdFactory()}`

  const newEntries: StockLedgerEntry[] = [
    {
      id: defaultIdFactory(),
      branchId: state.branchId,
      warehouseId: fromId,
      sku,
      qtyDelta: -Math.abs(qty),
      reason: `Warehouse Transfer -> ${toId}`,
      sourceDocumentType: "WAREHOUSE_TRANSFER",
      sourceDocumentId: transferId,
      sourceLineId: sku,
      createdAt: now,
      createdBy: input.operator,
    },
    {
      id: defaultIdFactory(),
      branchId: state.branchId,
      warehouseId: toId,
      sku,
      qtyDelta: Math.abs(qty),
      reason: `Warehouse Transfer <- ${fromId}`,
      sourceDocumentType: "WAREHOUSE_TRANSFER",
      sourceDocumentId: transferId,
      sourceLineId: sku,
      createdAt: now,
      createdBy: input.operator,
    },
  ]

  state.ledger = appendLedger(state.ledger, newEntries)

  const movement = addWarehouseMovement({
    branchId: state.branchId,
    item: sku,
    type: "Pindah",
    quantity: qty,
    fromLocation: fromId,
    toLocation: toId,
    operator: input.operator,
    reason: input.reason,
    note: input.note,
  })

  const key = movementLinkKey("WAREHOUSE_TRANSFER", transferId)
  state.warehouseMovementLinks[key] = [movement.id, ...(state.warehouseMovementLinks[key] ?? [])]

  return { movement: deepClone(movement), newEntries }
}

export function postWarehouseWriteOff(input: {
  branchId: string
  sku: string
  quantity: number
  fromWarehouseId: string
  operator: string

  reason?: string
  note?: string
}): { movement: StockMovement; newEntries: StockLedgerEntry[] } {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)

  const sku = (input.sku ?? "").trim()
  const qty = Math.trunc(Number(input.quantity) || 0)
  const fromId = (input.fromWarehouseId ?? "").trim()

  if (!sku) throw new Error("DOMAIN:INVALID_INPUT:SKU wajib.")
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("DOMAIN:INVALID_INPUT:Quantity harus > 0.")
  if (!fromId) throw new Error("DOMAIN:INVALID_INPUT:fromWarehouseId wajib.")

  const parsedFrom = parseConditionWarehouseId(fromId)
  const fromIsConditionInZone = Boolean(
    parsedFrom && isZoneId(state, parsedFrom.baseZoneId) && (parsedFrom.condition === "DAMAGED" || parsedFrom.condition === "EXPIRED")
  )
  if (!fromIsConditionInZone) {
    throw new Error("DOMAIN:INVALID_INPUT:Write-off hanya boleh dari stok Rusak/Kadaluarsa (di zona yang sama).")
  }

  const onHandFrom = getOnHandQty(state.ledger, {
    branchId: state.branchId,
    sku,
    warehouseId: fromId,
  })

  if (onHandFrom < qty) {
    throw new Error(
      `DOMAIN:INSUFFICIENT_STOCK:Stok tidak cukup di lokasi ${fromId}. Tersedia ${onHandFrom}, diminta ${qty}.`
    )
  }

  const now = nowIso()
  const writeOffId = `WWO-${defaultIdFactory()}`
  const conditionLabel = parsedFrom!.condition === "DAMAGED" ? "Rusak" : "Kadaluarsa"

  const newEntries: StockLedgerEntry[] = [
    {
      id: defaultIdFactory(),
      branchId: state.branchId,
      warehouseId: fromId,
      sku,
      qtyDelta: -Math.abs(qty),
      reason: `Write-off stok ${conditionLabel}`,
      sourceDocumentType: "WAREHOUSE_WRITE_OFF",
      sourceDocumentId: writeOffId,
      sourceLineId: sku,
      createdAt: now,
      createdBy: input.operator,
    },
  ]

  state.ledger = appendLedger(state.ledger, newEntries)

  const movement = addWarehouseMovement({
    branchId: state.branchId,
    item: sku,
    type: "Keluar",
    quantity: qty,
    fromLocation: fromId,
    toLocation: "Staging",
    operator: input.operator,
    sourceDocumentType: "WAREHOUSE_WRITE_OFF",
    sourceDocumentId: writeOffId,
    reason: input.reason,
    note: input.note,
  })

  const key = movementLinkKey("WAREHOUSE_WRITE_OFF", writeOffId)
  state.warehouseMovementLinks[key] = [movement.id, ...(state.warehouseMovementLinks[key] ?? [])]

  return { movement: deepClone(movement), newEntries }
}

function isZoneId(state: BranchState, locationId: string): boolean {
  const id = (locationId ?? "").trim()
  if (!id) return false
  if (id === "Receiving" || id === "Staging") return false
  return (state.warehouse.zones ?? []).some((z) => z.id === id && z.active !== false)
}

function ensureAtLeastOneWarehouseZone(state: BranchState): void {
  const zones = state.warehouse.zones ?? []
  const hasAnyActive = zones.some((z) => z.active !== false)
  if (hasAnyActive) return

  const prefix = zonePrefixFromBranchCode(state.branchCode)
  const zone: WarehouseZone = {
    id: makeNewZoneId([], `${prefix}`),
    name: "Zona 1",
    status: "Aktif",
    active: true,
  }
  state.warehouse.zones = [zone]
  state.warehouse.movements = state.warehouse.movements ?? []
}

function assertWarehouseZoneExists(state: BranchState): void {
  const zones = state.warehouse.zones ?? []
  const hasAnyActive = zones.some((z) => z.active !== false)
  if (hasAnyActive) return
  // Warehouse module may be disabled; don't block flows that can run without zones.
  return
}

function normalizeWarehouseZoneStatuses(state: BranchState): void {
  const zones = state.warehouse.zones ?? []
  for (const z of zones) {
    const raw = (z as unknown as { status?: unknown }).status
    if (raw !== "Aktif" && raw !== "Maintenance") {
      z.status = "Aktif"
    }
  }
}

function normalizeZoneName(name: string): string {
  return (name ?? "").trim().toLowerCase()
}

function legacyConditionFromZoneName(name: string): NonSellableStockCondition | null {
  const n = normalizeZoneName(name)
  if (n === "zona rusak") return "DAMAGED"
  if (n === "zona kadaluarsa") return "EXPIRED"
  return null
}

function isLegacyConditionZone(zone: WarehouseZone): boolean {
  return legacyConditionFromZoneName(zone.name) !== null
}

function resolveBaseZoneForLegacyMigration(state: BranchState): string {
  ensureAtLeastOneWarehouseZone(state)
  const activeZones = (state.warehouse.zones ?? []).filter((z) => z.active !== false)
  const nonLegacy = activeZones.find((z) => !isLegacyConditionZone(z))
  if (nonLegacy) return nonLegacy.id
  // Worst-case fallback: if only legacy zones exist, use the first active zone.
  return activeZones[0]!.id
}

function migrateLegacyConditionZones(state: BranchState): void {
  const zones = state.warehouse.zones ?? []
  if (!zones.length) return

  const legacyDamaged = zones.find((z) => legacyConditionFromZoneName(z.name) === "DAMAGED")
  const legacyExpired = zones.find((z) => legacyConditionFromZoneName(z.name) === "EXPIRED")
  if (!legacyDamaged && !legacyExpired) return

  const baseZoneId = resolveBaseZoneForLegacyMigration(state)
  const damagedTarget = conditionWarehouseId(baseZoneId, "DAMAGED")
  const expiredTarget = conditionWarehouseId(baseZoneId, "EXPIRED")

  const damagedId = legacyDamaged?.id
  const expiredId = legacyExpired?.id

  // Migrate ledger entries so historical stock remains visible in the new model.
  if (state.ledger?.length) {
    for (const e of state.ledger) {
      const wid = (e.warehouseId ?? "").trim()
      if (damagedId && wid === damagedId) e.warehouseId = damagedTarget
      if (expiredId && wid === expiredId) e.warehouseId = expiredTarget
    }
  }

  // Migrate movement history so UI/history doesn't reference removed zones.
  if (state.warehouse.movements?.length) {
    for (const m of state.warehouse.movements) {
      if (damagedId) {
        if ((m.fromLocation ?? "").trim() === damagedId) m.fromLocation = damagedTarget
        if ((m.toLocation ?? "").trim() === damagedId) m.toLocation = damagedTarget
      }
      if (expiredId) {
        if ((m.fromLocation ?? "").trim() === expiredId) m.fromLocation = expiredTarget
        if ((m.toLocation ?? "").trim() === expiredId) m.toLocation = expiredTarget
      }
    }
  }

  // Ensure default warehouse points to a normal zone.
  if (damagedId && state.defaultWarehouseId === damagedId) state.defaultWarehouseId = baseZoneId
  if (expiredId && state.defaultWarehouseId === expiredId) state.defaultWarehouseId = baseZoneId

  // Delete legacy zones if they are no longer referenced.
  // This frees IDs like Z-A2/Z-A3 so future zone creation doesn't “skip”.
  if (damagedId) {
    try {
      deleteWarehouseZone(state.branchId, damagedId)
    } catch {
      // If the zone is still in use for some reason, keep it but deactivate.
      const z = state.warehouse.zones.find((x) => x.id === damagedId)
      if (z) z.active = false
    }
  }
  if (expiredId) {
    try {
      deleteWarehouseZone(state.branchId, expiredId)
    } catch {
      const z = state.warehouse.zones.find((x) => x.id === expiredId)
      if (z) z.active = false
    }
  }
}

type WarehouseStockCondition = "GOOD" | "DAMAGED" | "EXPIRED"
type NonSellableStockCondition = Exclude<WarehouseStockCondition, "GOOD">

function conditionWarehouseId(baseZoneId: string, condition: NonSellableStockCondition): string {
  return `${baseZoneId}::${condition}`
}

function parseConditionWarehouseId(id: string): { baseZoneId: string; condition: NonSellableStockCondition } | null {
  const raw = (id ?? "").trim()
  const idx = raw.lastIndexOf("::")
  if (idx <= 0) return null
  const baseZoneId = raw.slice(0, idx)
  const condition = raw.slice(idx + 2)
  if (condition !== "DAMAGED" && condition !== "EXPIRED") return null
  return { baseZoneId, condition }
}

function isConditionWarehouseId(state: BranchState, warehouseId: string): boolean {
  const parsed = parseConditionWarehouseId(warehouseId)
  if (!parsed) return false
  return isZoneId(state, parsed.baseZoneId)
}

function warehouseIdForReturnCondition(input: {
  state: BranchState
  requestedWarehouseId: string
  condition: WarehouseStockCondition
}): string {
  const { state, requestedWarehouseId, condition } = input
  ensureDefaultWarehouseId(state)
  if (condition === "GOOD") return requestedWarehouseId
  // Non-sellable stock stays in the same zone, but recorded under a condition sub-location.
  return conditionWarehouseId(requestedWarehouseId, condition)
}

function ensureDefaultWarehouseId(state: BranchState): void {
  const current = (state.defaultWarehouseId ?? "").trim()
  if (current && isValidWarehouseLocation(state, current) && isZoneId(state, current)) {
    const z = (state.warehouse.zones ?? []).find((x) => x.id === current)
    if (z && z.active !== false && !legacyConditionFromZoneName(z.name)) return
  }

  const firstActiveZoneId = (state.warehouse.zones ?? []).find(
    (z) => z.active !== false && !legacyConditionFromZoneName(z.name)
  )?.id
  state.defaultWarehouseId = firstActiveZoneId && isValidWarehouseLocation(state, firstActiveZoneId) ? firstActiveZoneId : "Staging"
}

function autoCreateMovementsFromEntries(input: {
  state: BranchState
  sourceType: string
  docId: string
  entries: StockLedgerEntry[]
  operator: string
}): void {
  const { state, sourceType, docId, entries, operator } = input
  if (!entries.length) return
  if ((state.warehouse.zones ?? []).length === 0) return

  const key = movementLinkKey(sourceType, docId)
  const createdIds: string[] = []

  for (const e of entries) {
    const qty = Math.trunc(Number(e.qtyDelta) || 0)
    if (!qty) continue

    const loc = resolveWarehouseId(state, e.warehouseId)
    if (!isZoneId(state, loc) && !isConditionWarehouseId(state, loc)) continue

    try {
      if (qty > 0) {
        const parsedLoc = parseConditionWarehouseId(loc)
        const movementToLocation = parsedLoc?.baseZoneId ?? loc
        const normalizedReason = (e.reason ?? "").trim()
        const reason =
          parsedLoc && sourceType === "RETURN"
            ? normalizedReason || `Customer return (${parsedLoc.condition})`
            : normalizedReason || undefined

        const mv = addWarehouseMovement({
          branchId: state.branchId,
          item: e.sku,
          type: "Masuk",
          quantity: qty,
          fromLocation: "Receiving",
          toLocation: movementToLocation,
          operator,
          sourceDocumentType: sourceType,
          sourceDocumentId: docId,
          reason,
          note: (e.note ?? "").trim() || undefined,
        })
        createdIds.push(mv.id)
      } else {
        const mv = addWarehouseMovement({
          branchId: state.branchId,
          item: e.sku,
          type: "Keluar",
          quantity: Math.abs(qty),
          fromLocation: loc,
          toLocation: "Staging",
          operator,
          sourceDocumentType: sourceType,
          sourceDocumentId: docId,
          reason: (e.reason ?? "").trim() || undefined,
          note: (e.note ?? "").trim() || undefined,
        })
        createdIds.push(mv.id)
      }
    } catch {
      // Movement auto-generation is best-effort and must not block source document posting.
      continue
    }
  }

  if (createdIds.length > 0) {
    state.warehouseMovementLinks[key] = [...createdIds, ...(state.warehouseMovementLinks[key] ?? [])]
  }
}

function autoVoidLinkedMovements(input: {
  state: BranchState
  sourceType: string
  docId: string
  operator: string
  reason: string
}): void {
  const { state, sourceType, docId, operator, reason } = input
  const key = movementLinkKey(sourceType, docId)
  const ids = state.warehouseMovementLinks[key] ?? []
  if (ids.length === 0) return

  for (const movementId of ids) {
    try {
      voidWarehouseMovement({
        branchId: state.branchId,
        movementId,
        operator,
        reason,
      })
    } catch {
      // Best-effort: movement may have been removed by zone cleanup.
    }
  }
}

function isValidWarehouseLocation(state: BranchState, warehouseId: string): boolean {
  const id = (warehouseId ?? "").trim()
  if (!id) return false
  if (id === "Receiving" || id === "Staging") return true
  if (isConditionWarehouseId(state, id)) return true
  return (state.warehouse.zones ?? []).some((z) => z.id === id && z.active !== false)
}

function resolveWarehouseId(state: BranchState, warehouseId: string | undefined): string {
  const raw = (warehouseId ?? "").trim()
  if (raw) {
    if (!isValidWarehouseLocation(state, raw)) throw new Error("INVALID_WAREHOUSE_ID")
    return raw
  }
  ensureDefaultWarehouseId(state)
  return state.defaultWarehouseId
}

// In Next.js dev (and sometimes in production serverless setups), different route handlers can
// end up with separate module instances. If we keep mock state in a module-level singleton,
// writes from one route (e.g. POST /api/pos/sales) may not be visible to another route
// (e.g. GET /api/products). Storing on globalThis keeps it shared within the same Node.js process.
type GlobalWithMockDb = typeof globalThis & {
  __erpTokoBangunanMockDb?: Map<string, BranchState>
  __erpTokoBangunanMockUsersStore?: MockUsersStore
}

const globalForMockDb = globalThis as GlobalWithMockDb
const db =
  globalForMockDb.__erpTokoBangunanMockDb ??
  (globalForMockDb.__erpTokoBangunanMockDb = new Map<string, BranchState>())

// Users store (global; not per-branch)
// NOTE: This is ONLY the state layer for Plan 1.
// Plan 2 will add service functions (list/create/update/delete) that operate on this store.
export type MockUserRow = {
  id: string
  name: string
  email: string
  role: Role
  branch?: string
  password: string
  active: boolean
}

type MockUsersStore = {
  users: MockUserRow[]
}

function createSeedPassword(value: string): string {
  return hashPassword(value)
}

const DEFAULT_USERS_SEED: ReadonlyArray<Readonly<MockUserRow>> = [
  {
    id: "u2",
    name: "Admin Kasir",
    email: "kasir@cabang-a.com",
    role: "admin-penjualan",
    branch: "cabang-a",
    password: createSeedPassword("kasirpass1"),
    active: true,
  },
]

function cloneMockUser(user: Readonly<MockUserRow>): MockUserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch,
    password: user.password,
    active: user.active,
  }
}

function createDefaultUsersStore(): MockUsersStore {
  return {
    users: DEFAULT_USERS_SEED.map(cloneMockUser),
  }
}

function migrateUsersStorePasswords(store: MockUsersStore): void {
  for (const user of store.users) {
    if (!needsPasswordRehash(user.password)) continue

    const legacyPassword = String(user.password ?? "")
    if (!legacyPassword) continue
    user.password = hashPassword(legacyPassword)
  }
}

export function ensureUsersStore(): MockUsersStore {
  if (globalForMockDb.__erpTokoBangunanMockUsersStore) {
    migrateUsersStorePasswords(globalForMockDb.__erpTokoBangunanMockUsersStore)
    return globalForMockDb.__erpTokoBangunanMockUsersStore
  }

  globalForMockDb.__erpTokoBangunanMockUsersStore = createDefaultUsersStore()
  migrateUsersStorePasswords(globalForMockDb.__erpTokoBangunanMockUsersStore)

  return globalForMockDb.__erpTokoBangunanMockUsersStore
}

function toPublicUser(u: MockUserRow): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branch: u.branch,
    active: u.active,
  }
}

function nextUserId(users: MockUserRow[]): string {
  const max = users
    .map((u) => Number(String(u.id).replace(/^u/, "")))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `u${max + 1}`
}

function findUserById(store: MockUsersStore, id: string): MockUserRow | undefined {
  const key = (id ?? "").trim()
  if (!key) return undefined
  return store.users.find((x) => x.id === key)
}

function findUserByNormalizedEmail(store: MockUsersStore, normalizedEmail: string): MockUserRow | undefined {
  if (!normalizedEmail) return undefined
  return store.users.find((x) => normalizeEmail(x.email) === normalizedEmail)
}

function findUserByEmail(store: MockUsersStore, email: string): MockUserRow | undefined {
  const normalized = normalizeEmail(email)
  return findUserByNormalizedEmail(store, normalized)
}

export function listUsers(input: UsersListParams): UsersListResponse {
  const store = ensureUsersStore()

  const q = (input.q ?? "").trim()
  const qLower = q.toLowerCase()
  const role = (input.role ?? "all")
  const status = (input.status ?? "all")

  let list = store.users.slice()

  if (qLower) {
    list = list.filter((u) => {
      const name = (u.name ?? "").toLowerCase()
      const email = (u.email ?? "").toLowerCase()
      return name.includes(qLower) || email.includes(qLower)
    })
  }

  if (role !== "all") {
    list = list.filter((u) => u.role === role)
  }

  if (status === "active") {
    list = list.filter((u) => u.active)
  } else if (status === "inactive") {
    list = list.filter((u) => !u.active)
  }

  const total = list.length
  const limitRaw = Number(input.limit)
  const pageRaw = Number(input.page)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.trunc(limitRaw))) : 100
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1

  const start = (page - 1) * limit
  const users = list.slice(start, start + limit).map(toPublicUser)

  return {
    users,
    meta: {
      total,
      page,
      limit,
      q,
      role,
      status,
    },
  }
}

export function createUser(input: {
  name: string
  email: string
  password: string
  role: Role
  branch?: string
}): User {
  const store = ensureUsersStore()
  const name = (input.name ?? "").trim()
  const email = normalizeEmail(input.email)
  const role = input.role
  const branch = input.branch
  const centralBranchCode = getCentralBranch().code
  const normalizedBranch = (branch ?? "").trim() || centralBranchCode
  const password = String(input.password ?? "")

  if (!name || !email || !password || !role) {
    throw new Error("BAD_REQUEST")
  }

  if (findUserByEmail(store, email)) throw new Error("EMAIL_TAKEN")
  const branchPolicyError = getBranchPolicyErrorCode({ role, branch: normalizedBranch })
  if (branchPolicyError) throw new Error(branchPolicyError)
  if (getPasswordErrorCode(password)) throw new Error("INVALID_PASSWORD")

  const row: MockUserRow = {
    id: nextUserId(store.users),
    name,
    email,
    role,
    branch: normalizedBranch,
    password: hashPassword(password),
    active: true,
  }

  store.users.push(row)
  return toPublicUser(row)
}

export function updateUser(
  id: string,
  patch: {
    name?: string
    email?: string
    active?: boolean
  }
): User | null {
  const store = ensureUsersStore()
  const u = findUserById(store, id)
  if (!u) return null

  const nextName = patch.name !== undefined ? String(patch.name).trim() : undefined
  const nextEmail = patch.email !== undefined ? normalizeEmail(String(patch.email)) : undefined
  const nextActive = typeof patch.active === "boolean" ? patch.active : undefined

  if (nextEmail && nextEmail !== normalizeEmail(u.email) && findUserByEmail(store, nextEmail)) {
    throw new Error("EMAIL_TAKEN")
  }

  if (nextName !== undefined && !nextName) {
    throw new Error("BAD_REQUEST")
  }

  if (nextName !== undefined) u.name = nextName
  if (nextEmail !== undefined) u.email = nextEmail
  if (nextActive !== undefined) u.active = nextActive

  return toPublicUser(u)
}

export function setUserPassword(id: string, newPassword: string): boolean {
  const store = ensureUsersStore()
  const u = findUserById(store, id)
  if (!u) return false
  const pw = String(newPassword ?? "")
  if (getPasswordErrorCode(pw)) throw new Error("INVALID_PASSWORD")
  u.password = hashPassword(pw)
  return true
}

export function deleteUser(id: string): boolean {
  const store = ensureUsersStore()
  const key = (id ?? "").trim()
  if (!key) return false
  const idx = store.users.findIndex((x) => x.id === key)
  if (idx < 0) return false
  store.users.splice(idx, 1)
  return true
}

// Auth helpers
export function findAuthUserByEmail(email: string): MockUserRow | null {
  const store = ensureUsersStore()
  const found = findUserByEmail(store, email)
  return found ?? null
}

export function verifyAuthCredentials(input: { email: string; password: string }): MockUserRow | null {
  const user = findAuthUserByEmail(input.email)
  if (!user) return null
  if (!user.active) return null

  const password = String(input.password ?? "")
  if (!verifyPassword(password, user.password)) {
    return null
  }

  if (needsPasswordRehash(user.password)) {
    user.password = hashPassword(password)
  }

  return user
}

export function findFirstAuthUserByRole(role: Role): MockUserRow | null {
  const store = ensureUsersStore()
  const found = store.users.find((u) => u.role === role)
  return found ?? null
}

function seedBranch(branchId: string): BranchState {
  const branchCode = branchIdToCode(branchId)

  // UI prototype mode: start from a clean slate so business-flow simulations
  // (purchase -> stock -> POS sale -> return) can be tested from zero.
  const products: BranchProduct[] = []
  const categories: ProductCategory[] = []
  const warehouse: BranchWarehouseData = {
    zones: [],
    movements: [],
  }
  const defaultWarehouseId = ""
  const ledger: StockLedgerEntry[] = []
  const stockAdjustments: StockAdjustmentDocument[] = []

  return {
    branchId,
    branchCode,
    products,
    categories,
    ledger,
    stockAdjustments,
    sales: [],
    purchases: [],
    returns: [],
    warehouse,
    warehouseMovementLinks: {},
    defaultWarehouseId,
  }
}

export function ensureBranchState(branchId: string): BranchState {
  const id = (branchId ?? "").trim()
  if (!id) throw new Error("BRANCH_NOT_FOUND")

  const existing = db.get(id)
  if (existing) {
    // Keep legacy data compatible with the current warehouse + condition-stock model.
    normalizeWarehouseZoneStatuses(existing)
    migrateLegacyConditionZones(existing)
    ensureDefaultWarehouseId(existing)
    return existing
  }

  const created = seedBranch(id)
  normalizeWarehouseZoneStatuses(created)
  migrateLegacyConditionZones(created)
  ensureDefaultWarehouseId(created)
  db.set(id, created)
  return created
}

export function getStockProducts(branchId: string, warehouseId?: string): StockProductDto[] {
  const state = ensureBranchState(branchId)
  ensureCategoriesSynced(state)
  ensureDefaultWarehouseId(state)

  const resolvedWarehouseId = warehouseId ? resolveWarehouseId(state, warehouseId) : undefined

  return state.products
    .filter((p) => p.active !== false)
    .map((p) => {
      const onHandQty = getOnHandQty(state.ledger, {
        branchId: state.branchId,
        sku: p.sku,
        warehouseId: resolvedWarehouseId,
      })

      return {
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        category: p.category,
        prices: p.prices,
        hpp: Math.max(0, Math.trunc(Number(p.hpp) || 0)),
        stock: onHandQty,
      }
    })
}

export function getProducts(branchId: string): MasterProductDto[] {
  const state = ensureBranchState(branchId)
  ensureCategoriesSynced(state)
  ensureDefaultWarehouseId(state)
  return state.products
    .filter((p) => p.active !== false)
    .map((p) => ({
      sku: p.sku,
      name: p.name,
      categoryId: p.categoryId,
      category: p.category,
      prices: p.prices,
      hpp: Math.max(0, Math.trunc(Number(p.hpp) || 0)),
    }))
}

export function listPurchasesPage(input: {
  branchId: string
  q?: string
  status?: "Draft" | "Received" | "Paid" | "Voided"
  periodField?: "po" | "receive"
  fromTimestampMs?: number
  toTimestampMs?: number
  offset?: number
  limit?: number
}): { docs: PurchaseDocument[]; total: number } {
  const state = ensureBranchState(input.branchId)

  const q = (input.q ?? "").trim().toLowerCase()
  const status = (input.status ?? "").trim()
  const periodField = (input.periodField ?? "").trim() as "po" | "receive" | ""

  const fromTimestampMs =
    typeof input.fromTimestampMs === "number" && Number.isFinite(input.fromTimestampMs)
      ? input.fromTimestampMs
      : null
  const toTimestampMs =
    typeof input.toTimestampMs === "number" && Number.isFinite(input.toTimestampMs)
      ? input.toTimestampMs
      : null

  const offset =
    typeof input.offset === "number" && Number.isFinite(input.offset)
      ? Math.max(0, Math.trunc(input.offset))
      : 0
  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(0, Math.trunc(input.limit))
      : Number.MAX_SAFE_INTEGER
  const pageEndExclusive = offset + limit

  const statusUiOf = (doc: PurchaseDocument): "Draft" | "Received" | "Paid" | "Voided" => {
    if (doc.status === "VOID") return "Voided"
    if (doc.status === "DRAFT") return "Draft"
    return doc.paymentStatus === "tunai" ? "Paid" : "Received"
  }

  const docs: PurchaseDocument[] = []
  let total = 0

  for (const doc of state.purchases ?? []) {
    if (q) {
      const id = String(doc.id ?? "").toLowerCase()
      const supplier = String(doc.supplierName ?? "").toLowerCase()
      const phone = String(doc.supplierPhone ?? "").toLowerCase()
      const matches = id.includes(q) || supplier.includes(q) || phone.includes(q)
      if (!matches) continue
    }

    if (status && statusUiOf(doc) !== status) continue

    if (fromTimestampMs !== null || toTimestampMs !== null) {
      const timestampIso = periodField === "receive" ? (doc.postedAt ?? "") : (doc.createdAt ?? "")
      const timestampMs = new Date(timestampIso).getTime()
      if (!Number.isFinite(timestampMs)) continue
      if (fromTimestampMs !== null && timestampMs < fromTimestampMs) continue
      if (toTimestampMs !== null && timestampMs > toTimestampMs) continue
    }

    if (total >= offset && total < pageEndExclusive) {
      docs.push(deepClone(doc))
    }
    total += 1
  }

  return { docs, total }
}

export function listPurchases(input: {
  branchId: string
  q?: string
  status?: "Draft" | "Received" | "Paid" | "Voided"
  periodField?: "po" | "receive"
  from?: string
  to?: string
}): PurchaseDocument[] {
  const state = ensureBranchState(input.branchId)

  const q = (input.q ?? "").trim().toLowerCase()
  const status = (input.status ?? "").trim()
  const periodField = (input.periodField ?? "").trim() as "po" | "receive" | ""
  const from = (input.from ?? "").trim()
  const to = (input.to ?? "").trim()
  const hasAnyDateFilter = Boolean(from || to)

  const statusUiOf = (doc: PurchaseDocument): "Draft" | "Received" | "Paid" | "Voided" => {
    if (doc.status === "VOID") return "Voided"
    if (doc.status === "DRAFT") return "Draft"
    return doc.paymentStatus === "tunai" ? "Paid" : "Received"
  }

  const dateKeyFor = (doc: PurchaseDocument): string => {
    const iso = periodField === "receive" ? (doc.postedAt ?? "") : (doc.createdAt ?? "")
    return String(iso ?? "").slice(0, 10)
  }

  const next = (state.purchases ?? []).filter((doc) => {
    if (q) {
      const id = String(doc.id ?? "").toLowerCase()
      const supplier = String(doc.supplierName ?? "").toLowerCase()
      const phone = String(doc.supplierPhone ?? "").toLowerCase()
      const matches = id.includes(q) || supplier.includes(q) || phone.includes(q)
      if (!matches) return false
    }

    if (status) {
      if (statusUiOf(doc) !== status) return false
    }

    if (hasAnyDateFilter) {
      const key = dateKeyFor(doc)
      if (!key || key.length !== 10) return false
      if (from && key < from) return false
      if (to && key > to) return false
    }

    return true
  })

  return deepClone(next)
}

export function getPurchase(branchId: string, purchaseId: string): PurchaseDocument {
  const state = ensureBranchState(branchId)
  const id = (purchaseId ?? "").trim()
  if (!id) throw new Error("INVALID_PURCHASE_ID")
  const doc = state.purchases.find((p) => p.id === id)
  if (!doc) throw new Error("PURCHASE_NOT_FOUND")
  return deepClone(doc)
}

export function createPurchase(input: {
  branchId: string
  createdBy: string
  supplierName?: string
  supplierPhone?: string
  supplierAddress?: string
  paymentStatus: "tunai" | "tempo"
  paidAmount?: number
  dueDate?: string
  expectedDelivery?: string
  warehouseId?: string
  note?: string
  items: Array<{ sku: string; quantity: number; unitCost: number; discount: number; warehouseId?: string }>
}): PurchaseDocument {
  const state = ensureBranchState(input.branchId)
  assertWarehouseZoneExists(state)
  const now = nowIso()

  const productBySku = new Map(
    state.products
      .filter((p) => p.active !== false)
      .map((p) => [String(p.sku ?? "").trim().toLowerCase(), p] as const)
  )

  const seenSku = new Set<string>()

  for (const item of input.items ?? []) {
    const skuKey = String(item.sku ?? "").trim().toLowerCase()
    if (skuKey) {
      if (seenSku.has(skuKey)) {
        throw new Error(`DOMAIN:INVALID_INPUT:Produk SKU '${item.sku}' duplikat.`)
      }
      seenSku.add(skuKey)
    }
    if (!skuKey || !productBySku.has(skuKey)) {
      throw new Error(`DOMAIN:INVALID_INPUT:Produk SKU '${item.sku}' tidak ditemukan.`)
    }
  }

  const requestedWarehouseId = (input.warehouseId ?? "").trim()
  const warehouseId = requestedWarehouseId ? (isZoneId(state, requestedWarehouseId) ? requestedWarehouseId : "") : ""
  if (requestedWarehouseId && !warehouseId) {
    throw new Error("DOMAIN:INVALID_INPUT:Zona tujuan tidak valid.")
  }

  const normalizedItems = (input.items ?? []).map((item) => {
    const skuKey = String(item.sku ?? "").trim().toLowerCase()
    const product = productBySku.get(skuKey)
    const unitCostRaw = Number(item.unitCost ?? NaN)
    const fallbackHpp = Number(product?.hpp ?? 0)
    const unitCost = Number.isFinite(unitCostRaw) && unitCostRaw >= 0 ? unitCostRaw : Math.max(0, fallbackHpp)

    const requestedLineWarehouseId = (item.warehouseId ?? "").trim()
    const lineWarehouseId = requestedLineWarehouseId
      ? (isZoneId(state, requestedLineWarehouseId) ? requestedLineWarehouseId : "")
      : ""

    if (requestedLineWarehouseId && !lineWarehouseId) {
      throw new Error(`DOMAIN:INVALID_INPUT:Zona tujuan item SKU '${item.sku}' tidak valid.`)
    }

    return {
      ...item,
      unitCost,
      warehouseId: lineWarehouseId || undefined,
    }
  })

  for (const item of normalizedItems) {
    const skuKey = String(item.sku ?? "").trim().toLowerCase()
    const product = productBySku.get(skuKey)
    if (!product) continue
    const nextHpp = Math.max(0, Math.trunc(Number(item.unitCost) || 0))
    if (Number.isFinite(nextHpp) && nextHpp !== product.hpp) {
      product.hpp = nextHpp
    }
  }

  const draftRes = createPurchaseDraft({
    branchId: input.branchId,
    createdBy: input.createdBy,
    createdAt: now,
    supplierName: input.supplierName,
    supplierPhone: input.supplierPhone,
    supplierAddress: input.supplierAddress,
    paymentStatus: input.paymentStatus,
    paidAmount: input.paidAmount,
    dueDate: input.dueDate,
    expectedDelivery: input.expectedDelivery,
    warehouseId: warehouseId || undefined,
    note: input.note,
    items: normalizedItems,
  })

  if (!draftRes.ok) throw new Error(`DOMAIN:${draftRes.error.code}:${draftRes.error.message}`)
  state.purchases = [draftRes.value, ...state.purchases]
  return deepClone(draftRes.value)
}

export function receivePurchase(input: {
  branchId: string
  purchaseId: string
  receivedBy: string
  warehouseId?: string
  items?: Array<{ lineId?: string; sku?: string; quantity?: number }>
}): { doc: PurchaseDocument; newEntries: StockLedgerEntry[] } {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)
  const id = (input.purchaseId ?? "").trim()
  if (!id) throw new Error("INVALID_PURCHASE_ID")
  const doc = state.purchases.find((p) => p.id === id)
  if (!doc) throw new Error("PURCHASE_NOT_FOUND")

  // Mixed-zone receipts: fallback order per line: input.warehouseId -> doc.warehouseId -> branch default.
  const warehouseIdByLineId: Record<string, string> = {}
  for (const line of doc.items ?? []) {
    const candidate = (input.warehouseId ?? doc.warehouseId ?? state.defaultWarehouseId) || ""
    warehouseIdByLineId[line.id] = resolveWarehouseId(state, candidate)
  }

  const now = nowIso()
  const postedRes = postPurchaseReceipt({
    doc: deepClone(doc),
    postedBy: input.receivedBy,
    postedAt: now,
    warehouseIdByLineId,
    receiptItems: input.items,
  })

  if (!postedRes.ok) throw new Error(`DOMAIN:${postedRes.error.code}:${postedRes.error.message}`)

  // Persist updates
  Object.assign(doc, postedRes.value.doc)
  state.ledger = appendLedger(state.ledger, postedRes.value.newEntries)

  autoCreateMovementsFromEntries({
    state,
    sourceType: "PURCHASE_RECEIPT",
    docId: doc.id,
    entries: postedRes.value.newEntries,
    operator: input.receivedBy,
  })

  return { doc: deepClone(doc), newEntries: postedRes.value.newEntries }
}

export function voidPurchase(input: {
  branchId: string
  purchaseId: string
  voidedBy: string
}): PurchaseDocument {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)
  const id = (input.purchaseId ?? "").trim()
  if (!id) throw new Error("INVALID_PURCHASE_ID")
  const doc = state.purchases.find((p) => p.id === id)
  if (!doc) throw new Error("PURCHASE_NOT_FOUND")
  if (doc.status === "VOID") return deepClone(doc)

  const now = nowIso()
  const reversalEntries: StockLedgerEntry[] = doc.items.flatMap((item) => {
    const received = Math.max(0, Math.trunc(Number(item.receivedQty) || 0))
    if (!received) return []

    const candidate = (item.warehouseId ?? doc.warehouseId ?? state.defaultWarehouseId) || ""
    const warehouseId = resolveWarehouseId(state, candidate)
    return [
      {
        id: defaultIdFactory(),
        branchId: doc.branchId,
        warehouseId,
        sku: item.sku,
        qtyDelta: -Math.abs(received),
        reason: "Purchase VOID",
        sourceDocumentType: "PURCHASE_RECEIPT",
        sourceDocumentId: doc.id,
        sourceLineId: item.id,
        createdAt: now,
        createdBy: input.voidedBy,
      },
    ]
  })

  if (reversalEntries.length > 0) {
    state.ledger = appendLedger(state.ledger, reversalEntries)
  }

  autoVoidLinkedMovements({
    state,
    sourceType: "PURCHASE_RECEIPT",
    docId: doc.id,
    operator: input.voidedBy,
    reason: "Purchase VOID",
  })

  doc.status = "VOID"
  doc.postedBy = input.voidedBy
  doc.items = doc.items.map((it) => ({ ...it, receivedQty: 0 }))
  return deepClone(doc)
}

export function markPurchasePaid(input: {
  branchId: string
  purchaseId: string
  paidBy: string
  paidAmount?: number
}): PurchaseDocument {
  const state = ensureBranchState(input.branchId)
  const id = (input.purchaseId ?? "").trim()
  if (!id) throw new Error("INVALID_PURCHASE_ID")
  const doc = state.purchases.find((p) => p.id === id)
  if (!doc) throw new Error("PURCHASE_NOT_FOUND")
  if (doc.status === "VOID") throw new Error("PURCHASE_VOIDED")

  if (doc.status !== "POSTED") {
    throw new Error(
      "DOMAIN:INVALID_STATUS_TRANSITION:Pembayaran hanya bisa ditandai setelah PO diterima (POSTED)."
    )
  }

  doc.paymentStatus = "tunai"
  const paid = Number.isFinite(Number(input.paidAmount)) ? Math.max(0, Number(input.paidAmount) || 0) : undefined
  doc.paidAmount = paid
  doc.dueDate = undefined

  // For visibility, reuse postedBy as last editor.
  doc.postedBy = input.paidBy
  return deepClone(doc)
}

export function listReturns(branchId: string): ReturnDocument[] {
  const state = ensureBranchState(branchId)
  return deepClone(state.returns)
}

export function getReturn(branchId: string, returnId: string): ReturnDocument {
  const state = ensureBranchState(branchId)
  const id = (returnId ?? "").trim()
  if (!id) throw new Error("INVALID_RETURN_ID")
  const doc = state.returns.find((r) => r.id === id)
  if (!doc) throw new Error("RETURN_NOT_FOUND")
  return deepClone(doc)
}

export function createReturnDoc(input: {
  branchId: string
  createdBy: string
  createdByUserId?: string
  createdByRole?: string
  type: "CUSTOMER" | "SUPPLIER"
  condition: "GOOD" | "DAMAGED" | "EXPIRED"
  customerOrSupplierName?: string
  originalSalesId?: string
  sourceDocumentType?: "SALES" | "PURCHASE"
  sourceDocumentId?: string
  note?: string
  warehouseId?: string
  items: Array<{ sku: string; quantity: number; unitRefund: number; reason: string; sourceLineId?: string }>
}): ReturnDocument {
  const state = ensureBranchState(input.branchId)
  assertWarehouseZoneExists(state)
  const now = nowIso()

  const requestedWarehouseId = (input.warehouseId ?? "").trim()
  if (requestedWarehouseId && !isZoneId(state, requestedWarehouseId)) {
    throw new Error("DOMAIN:INVALID_INPUT:Zona tujuan tidak valid.")
  }

  const draftRes = createReturnDraft({
    branchId: input.branchId,
    createdBy: input.createdBy,
    createdAt: now,
    type: input.type,
    condition: input.condition,
    customerOrSupplierName: input.customerOrSupplierName,
    originalSalesId: input.originalSalesId,
    sourceDocumentType: input.sourceDocumentType,
    sourceDocumentId: input.sourceDocumentId,
    note: input.note,
    warehouseId: requestedWarehouseId || undefined,
    items: input.items,
  })
  if (!draftRes.ok) throw new Error(`DOMAIN:${draftRes.error.code}:${draftRes.error.message}`)

  draftRes.value.auditTrail = {
    createdByUserId: (input.createdByUserId ?? "").trim() || undefined,
    createdByRole: (input.createdByRole ?? "").trim() || undefined,
  }
  draftRes.value.auditEvents = [
    {
      action: "CREATED",
      at: now,
      actorName: input.createdBy,
      actorUserId: (input.createdByUserId ?? "").trim() || undefined,
      actorRole: (input.createdByRole ?? "").trim() || undefined,
    },
  ]

  state.returns = [draftRes.value, ...state.returns]
  return deepClone(draftRes.value)
}

export function postReturnDoc(input: {
  branchId: string
  returnId: string
  postedBy: string
  postedByUserId?: string
  postedByRole?: string
  warehouseId?: string
  allowNegativeStock?: boolean
}): { doc: ReturnDocument; newEntries: StockLedgerEntry[] } {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)
  const id = (input.returnId ?? "").trim()
  if (!id) throw new Error("INVALID_RETURN_ID")
  const doc = state.returns.find((r) => r.id === id)
  if (!doc) throw new Error("RETURN_NOT_FOUND")

  const rawWarehouseId = (input.warehouseId ?? doc.warehouseId ?? "").trim()
  if (!rawWarehouseId) throw new Error("DOMAIN:INVALID_INPUT:warehouseId wajib.")
  const requestedWarehouseId = resolveWarehouseId(state, rawWarehouseId)
  const warehouseId =
    doc.type === "CUSTOMER"
      ? warehouseIdForReturnCondition({ state, requestedWarehouseId, condition: doc.condition })
      : requestedWarehouseId
  const now = nowIso()

  const postedRes = postReturn({
    doc: deepClone(doc),
    ledger: state.ledger,
    postedBy: input.postedBy,
    postedAt: now,
    warehouseId,
    allowNegativeStock: input.allowNegativeStock,
  })
  if (!postedRes.ok) throw new Error(`DOMAIN:${postedRes.error.code}:${postedRes.error.message}`)

  Object.assign(doc, postedRes.value.doc)
  doc.auditTrail = {
    ...(doc.auditTrail ?? {}),
    postedByUserId: (input.postedByUserId ?? "").trim() || undefined,
    postedByRole: (input.postedByRole ?? "").trim() || undefined,
    postedAt: now,
  }
  doc.auditEvents = [
    ...(doc.auditEvents ?? []),
    {
      action: "POSTED",
      at: now,
      actorName: input.postedBy,
      actorUserId: (input.postedByUserId ?? "").trim() || undefined,
      actorRole: (input.postedByRole ?? "").trim() || undefined,
    },
  ]
  state.ledger = appendLedger(state.ledger, postedRes.value.newEntries)

  autoCreateMovementsFromEntries({
    state,
    sourceType: "RETURN",
    docId: doc.id,
    entries: postedRes.value.newEntries,
    operator: input.postedBy,
  })
  return { doc: deepClone(doc), newEntries: postedRes.value.newEntries }
}

export function voidReturnDoc(input: {
  branchId: string
  returnId: string
  voidedBy: string
  voidedByUserId?: string
  voidedByRole?: string
}): ReturnDocument {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)
  const id = (input.returnId ?? "").trim()
  if (!id) throw new Error("INVALID_RETURN_ID")
  const doc = state.returns.find((r) => r.id === id)
  if (!doc) throw new Error("RETURN_NOT_FOUND")
  if (doc.status === "VOID") return deepClone(doc)

  const voidedAt = nowIso()

  if (doc.status === "POSTED") {
    const now = nowIso()
    const postedEntries = state.ledger.filter((e) => e.sourceDocumentType === "RETURN" && e.sourceDocumentId === doc.id)

    const reversalEntries: StockLedgerEntry[] = postedEntries
      .map((e) => ({
        id: defaultIdFactory(),
        branchId: e.branchId,
        warehouseId: e.warehouseId,
        sku: e.sku,
        qtyDelta: -Math.trunc(Number(e.qtyDelta) || 0),
        reason: "Return VOID",
        sourceDocumentType: "RETURN" as const,
        sourceDocumentId: doc.id,
        sourceLineId: e.sourceLineId,
        createdAt: now,
        createdBy: input.voidedBy,
      }))
      .filter((e) => e.qtyDelta !== 0)

    if (reversalEntries.length > 0) {
      state.ledger = appendLedger(state.ledger, reversalEntries)
    }
  }

  autoVoidLinkedMovements({
    state,
    sourceType: "RETURN",
    docId: doc.id,
    operator: input.voidedBy,
    reason: "Return VOID",
  })

  doc.status = "VOID"
  doc.postedBy = input.voidedBy
  doc.auditTrail = {
    ...(doc.auditTrail ?? {}),
    voidedByUserId: (input.voidedByUserId ?? "").trim() || undefined,
    voidedByRole: (input.voidedByRole ?? "").trim() || undefined,
    voidedAt,
  }
  doc.auditEvents = [
    ...(doc.auditEvents ?? []),
    {
      action: "VOIDED",
      at: voidedAt,
      actorName: input.voidedBy,
      actorUserId: (input.voidedByUserId ?? "").trim() || undefined,
      actorRole: (input.voidedByRole ?? "").trim() || undefined,
    },
  ]
  return deepClone(doc)
}

function computeZoneItemBalances(warehouse: BranchWarehouseData): Map<string, Map<string, number>> {
  const zones = warehouse.zones ?? []
  const zoneIds = new Set(zones.map((z) => z.id))
  const byZone = new Map<string, Map<string, number>>()

  const ensureZone = (zoneId: string) => {
    const existing = byZone.get(zoneId)
    if (existing) return existing
    const next = new Map<string, number>()
    byZone.set(zoneId, next)
    return next
  }

  const add = (zoneId: string, sku: string, delta: number) => {
    if (!zoneIds.has(zoneId)) return
    const z = ensureZone(zoneId)
    z.set(sku, (z.get(sku) ?? 0) + delta)
  }

  for (const movement of warehouse.movements ?? []) {
    if (movement.status === "VOID") continue
    const sku = (movement.item ?? "").trim()
    if (!sku) continue
    const qty = Math.max(0, Math.trunc(Number(movement.quantity) || 0))
    if (qty <= 0) continue

    if (movement.type === "Masuk") {
      add(movement.toLocation, sku, qty)
    } else if (movement.type === "Keluar") {
      add(movement.fromLocation, sku, -qty)
    } else {
      add(movement.fromLocation, sku, -qty)
      add(movement.toLocation, sku, qty)
    }
  }

  // Drop non-positive balances.
  for (const [zoneId, items] of byZone.entries()) {
    for (const [sku, balance] of items.entries()) {
      if (!(balance > 0)) items.delete(sku)
    }
    if (items.size === 0) byZone.delete(zoneId)
  }

  return byZone
}

export function addProduct(input: {
  branchId: string
  sku: string
  name: string
  categoryId?: string
  category?: string
  prices: Record<PriceTier, number>
  hpp: number
  stockQuantity: number
}): BranchProduct {
  const state = ensureBranchState(input.branchId)
  ensureCategoriesSynced(state)
  const sku = (input.sku ?? "").trim()
  const name = (input.name ?? "").trim()
  const requestedCategoryId = (input.categoryId ?? "").trim()
  const requestedCategoryName = (input.category ?? "").trim()
  const categoryFromId = requestedCategoryId ? findActiveCategoryById(state, requestedCategoryId) : undefined
  if (requestedCategoryId && !categoryFromId) {
    throw new Error("DOMAIN:INVALID_INPUT:Kategori tidak valid.")
  }
  const categoryFromName = !requestedCategoryId ? ensureCategoryForName(state, requestedCategoryName || undefined) : undefined
  const resolvedCategory = categoryFromId ?? categoryFromName

  if (!sku) throw new Error("INVALID_SKU")
  if (!name) throw new Error("INVALID_NAME")

  const exists = state.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())
  if (exists) throw new Error("SKU_ALREADY_EXISTS")

  const nextId =
    state.products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1

  const product: BranchProduct = {
    id: nextId,
    sku,
    name,
    active: true,
    prices: {
      retail: Math.max(0, Number(input.prices.retail) || 0),
      partai: Math.max(0, Number(input.prices.partai) || 0),
      cabang: Math.max(0, Number(input.prices.cabang) || 0),
    },
    hpp: Math.max(0, Math.trunc(Number(input.hpp) || 0)),
    stock: Math.max(0, Math.trunc(Number(input.stockQuantity) || 0)),
    categoryId: resolvedCategory?.id,
    category: resolvedCategory?.name,
  }

  state.products = [product, ...state.products]

  const openingQty = Math.max(0, Math.trunc(Number(input.stockQuantity) || 0))
  if (openingQty > 0) {
    const createdAt = nowIso()
    const draftRes = createStockAdjustmentDraft({
      branchId: state.branchId,
      createdBy: "SYSTEM",
      createdAt,
      note: `Stok awal produk ${sku}`,
      lines: [{ sku, qtyDelta: openingQty, reason: "Stok awal produk" }],
    })

    if (!draftRes.ok) throw new Error(`DOMAIN:${draftRes.error.code}:${draftRes.error.message}`)

    const postedRes = postStockAdjustment({
      doc: draftRes.value,
      ledger: state.ledger,
      postedAt: createdAt,
      postedBy: "SYSTEM",
    })

    if (!postedRes.ok) throw new Error(`DOMAIN:${postedRes.error.code}:${postedRes.error.message}`)

    state.ledger = appendLedger(state.ledger, postedRes.value.newEntries)
    state.stockAdjustments.unshift(postedRes.value.doc)

    autoCreateMovementsFromEntries({
      state,
      sourceType: "STOCK_VARIANCE",
      docId: postedRes.value.doc.id,
      entries: postedRes.value.newEntries,
      operator: "SYSTEM",
    })
  }

  return product
}

export function updateProduct(input: {
  branchId: string
  sku: string
  name?: string
  categoryId?: string
  category?: string
  prices?: Partial<Record<PriceTier, number | undefined>>
  hpp?: number
  stockQuantity?: number
}): BranchProduct {
  const state = ensureBranchState(input.branchId)
  ensureCategoriesSynced(state)
  const sku = (input.sku ?? "").trim()
  if (!sku) throw new Error("INVALID_SKU")

  const product = state.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase())
  if (!product) throw new Error("PRODUCT_NOT_FOUND")

  if (input.name !== undefined) {
    const nextName = input.name.trim()
    if (!nextName) throw new Error("INVALID_NAME")
    product.name = nextName
  }

  if (input.categoryId !== undefined) {
    const nextId = (input.categoryId ?? "").trim()
    if (!nextId) {
      product.categoryId = undefined
      product.category = undefined
    } else {
      const cat = findActiveCategoryById(state, nextId)
      if (!cat) throw new Error("DOMAIN:INVALID_INPUT:Kategori tidak valid.")
      product.categoryId = cat.id
      product.category = cat.name
    }
  } else if (input.category !== undefined) {
    const cat = ensureCategoryForName(state, input.category)
    product.categoryId = cat?.id
    product.category = cat?.name
  }

  if (input.prices) {
    const { retail, partai, cabang } = input.prices
    if (retail !== undefined) product.prices.retail = Math.max(0, Number(retail) || 0)
    if (partai !== undefined) product.prices.partai = Math.max(0, Number(partai) || 0)
    if (cabang !== undefined) product.prices.cabang = Math.max(0, Number(cabang) || 0)
  }

  if (input.hpp !== undefined) {
    product.hpp = Math.max(0, Math.trunc(Number(input.hpp) || 0))
  }

  if (input.stockQuantity !== undefined) {
    const desiredStock = Math.max(0, Math.trunc(Number(input.stockQuantity) || 0))
    const currentStock = getOnHandQty(state.ledger, {
      branchId: state.branchId,
      sku: product.sku,
    })

    const delta = desiredStock - currentStock
    if (delta !== 0) {
      const createdAt = nowIso()
      const draftRes = createStockAdjustmentDraft({
        branchId: state.branchId,
        createdBy: "SYSTEM",
        createdAt,
        note: `Penyesuaian stok produk ${product.sku}`,
        lines: [{ sku: product.sku, qtyDelta: delta, reason: "Penyesuaian stok dari master data" }],
      })

      if (!draftRes.ok) throw new Error(`DOMAIN:${draftRes.error.code}:${draftRes.error.message}`)

      const postedRes = postStockAdjustment({
        doc: draftRes.value,
        ledger: state.ledger,
        postedAt: createdAt,
        postedBy: "SYSTEM",
      })

      if (!postedRes.ok) throw new Error(`DOMAIN:${postedRes.error.code}:${postedRes.error.message}`)

      state.ledger = appendLedger(state.ledger, postedRes.value.newEntries)
      state.stockAdjustments.unshift(postedRes.value.doc)

      autoCreateMovementsFromEntries({
        state,
        sourceType: "STOCK_VARIANCE",
        docId: postedRes.value.doc.id,
        entries: postedRes.value.newEntries,
        operator: "SYSTEM",
      })
    }

    product.stock = desiredStock
  }

  return product
}

export function deleteProduct(input: { branchId: string; sku: string }): void {
  const state = ensureBranchState(input.branchId)
  ensureCategoriesSynced(state)
  const sku = (input.sku ?? "").trim()
  if (!sku) throw new Error("INVALID_SKU")

  const product = state.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase())
  if (!product) throw new Error("PRODUCT_NOT_FOUND")

  const skuKey = product.sku.toLowerCase()
  const onHandQty = getOnHandQty(state.ledger, { branchId: input.branchId, sku: product.sku })
  const usedInLedger = (state.ledger ?? []).some((e) => (e.sku ?? "").toLowerCase() === skuKey)
  const usedInSales = (state.sales ?? []).some((s) => (s.items ?? []).some((i) => (i.sku ?? "").toLowerCase() === skuKey))
  const usedInPurchases = (state.purchases ?? []).some((p) => (p.items ?? []).some((i) => (i.sku ?? "").toLowerCase() === skuKey))
  const usedInReturns = (state.returns ?? []).some((r) => (r.items ?? []).some((i) => (i.sku ?? "").toLowerCase() === skuKey))
  const usedInAdjustments = (state.stockAdjustments ?? []).some((a) => (a.lines ?? []).some((l) => (l.sku ?? "").toLowerCase() === skuKey))

  const isUsed = onHandQty !== 0 || usedInLedger || usedInSales || usedInPurchases || usedInReturns || usedInAdjustments

  if (isUsed) {
    // Soft delete: keep record for audit/history.
    product.active = false
  } else {
    // Hard delete only if never used.
    state.products = state.products.filter((p) => p.sku.toLowerCase() !== skuKey)
  }
  ensureCategoriesSynced(state)
}

export function getProductCategories(branchId: string): ProductCategoryDto[] {
  const state = ensureBranchState(branchId)
  ensureCategoriesSynced(state)

  return state.categories
    .filter((c) => c.active !== false)
    .map((c) => ({ id: c.id, name: c.name }))
}

export function addProductCategory(input: { branchId: string; name: string }): ProductCategoryDto {
  const state = ensureBranchState(input.branchId)
  ensureCategoriesSynced(state)

  const raw = (input.name ?? "").trim().replace(/\s+/g, " ")
  if (!raw) throw new Error("INVALID_CATEGORY_NAME")

  const key = normalizeCategoryKey(raw)
  const existing = state.categories.find((c) => normalizeCategoryKey(c.name) === key)
  if (existing) {
    if (existing.active === false) {
      existing.active = true
      existing.name = raw
      ensureCategoriesSynced(state)
      return { id: existing.id, name: existing.name }
    }
    throw new Error("CATEGORY_ALREADY_EXISTS")
  }

  const created: ProductCategory = {
    id: makeNewProductCategoryId(state),
    name: raw,
    createdAt: nowIso(),
    active: true,
  }
  state.categories = [created, ...state.categories]
  ensureCategoriesSynced(state)
  return { id: created.id, name: created.name }
}

export function updateProductCategory(input: {
  branchId: string
  id: string
  name: string
}): ProductCategoryDto {
  const state = ensureBranchState(input.branchId)
  ensureCategoriesSynced(state)

  const id = (input.id ?? "").trim()
  if (!id) throw new Error("INVALID_CATEGORY_ID")

  const raw = (input.name ?? "").trim().replace(/\s+/g, " ")
  if (!raw) throw new Error("INVALID_CATEGORY_NAME")

  const category = state.categories.find((c) => c.id === id)
  if (!category) throw new Error("CATEGORY_NOT_FOUND")

  const nextKey = normalizeCategoryKey(raw)
  const other = state.categories.find((c) => c.id !== id && normalizeCategoryKey(c.name) === nextKey && c.active !== false)
  if (other) throw new Error("CATEGORY_ALREADY_EXISTS")

  category.name = raw
  category.active = true

  // Normalize product references to keep category naming consistent.
  ensureCategoriesSynced(state)
  return { id: category.id, name: category.name }
}

export function deleteProductCategory(input: { branchId: string; id: string }): void {
  const state = ensureBranchState(input.branchId)
  ensureCategoriesSynced(state)
  const id = (input.id ?? "").trim()
  if (!id) throw new Error("INVALID_CATEGORY_ID")

  const category = state.categories.find((c) => c.id === id)
  if (!category) throw new Error("CATEGORY_NOT_FOUND")

  const key = normalizeCategoryKey(category.name)
  const inUse = state.products.some((p) => (p.categoryId ?? "").trim() === id || normalizeCategoryKey(p.category ?? "") === key)
  if (inUse) {
    category.active = false
    return
  }

  state.categories = state.categories.filter((c) => c.id !== id)
}

export function postStockAdjustmentDocument(input: {
  branchId: string
  postedBy: string
  warehouseId?: string
  allowNegativeStock?: boolean
  note?: string
  lines: Array<{ sku: string; qtyDelta: number; reason: string; note?: string }>
}): { doc: StockAdjustmentDocument; newEntries: StockLedgerEntry[] } {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)

  const note = (input.note ?? "").trim()
  if (!note) {
    throw new Error("DOMAIN:INVALID_INPUT:Catatan wajib diisi.")
  }

  const createdAt = nowIso()
  const draftRes = createStockAdjustmentDraft({
    branchId: input.branchId,
    createdAt,
    createdBy: input.postedBy,
    note,
    lines: input.lines,
  })

  if (!draftRes.ok) {
    const e = draftRes.error
    throw new Error(`DOMAIN:${e.code}:${e.message}`)
  }

  const postedRes = postStockAdjustment({
    doc: draftRes.value,
    ledger: state.ledger,
    postedAt: nowIso(),
    postedBy: input.postedBy,
    warehouseId: resolveWarehouseId(state, input.warehouseId),
    allowNegativeStock: input.allowNegativeStock,
  })

  if (!postedRes.ok) {
    const e = postedRes.error
    throw new Error(`DOMAIN:${e.code}:${e.message}`)
  }

  state.ledger = appendLedger(state.ledger, postedRes.value.newEntries)
  state.stockAdjustments.unshift(postedRes.value.doc)

  autoCreateMovementsFromEntries({
    state,
    sourceType: "STOCK_VARIANCE",
    docId: postedRes.value.doc.id,
    entries: postedRes.value.newEntries,
    operator: input.postedBy,
  })

  return { doc: postedRes.value.doc, newEntries: postedRes.value.newEntries }
}

export function postSale(input: {
  branchId: string
  postedBy: string
  salespersonName?: string
  warehouseId?: string
  allowNegativeStock?: boolean
  paymentStatus: "tunai" | "tempo"
  paidAmount?: number
  dueDate?: string
  orderDiscount: number
  customerName?: string
  customerAddress?: string
  customerPhone?: string
  items: Array<{
    sku: string
    quantity: number
    unitPrice: number
    discount: number
    priceTier: PriceTier
    warehouseId?: string
  }>
}): { doc: SalesDocument; newEntries: StockLedgerEntry[] } {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)

  // Resolve per-line warehouseId (fallback to transaction-level warehouseId, then default warehouse).
  // Also: pricing is authoritative on the server (prototype-hardening).
  const productsBySku = new Map(
    (state.products ?? []).map((p) => [String(p.sku ?? "").trim().toLowerCase(), p])
  )

  const resolvedItems = input.items.map((i) => {
    const sku = String(i.sku ?? "").trim()
    const skuKey = sku.toLowerCase()
    const product = productsBySku.get(skuKey)
    if (!product) {
      throw new Error(`DOMAIN:INVALID_INPUT:Produk tidak ditemukan untuk SKU ${sku}.`)
    }

    const rawTierPrice = (product.prices as Record<string, unknown> | undefined)?.[i.priceTier]
    const tierPrice = Number(rawTierPrice)
    if (!Number.isFinite(tierPrice) || tierPrice < 0) {
      throw new Error(`DOMAIN:INVALID_INPUT:Harga tidak valid untuk SKU ${sku} (tier ${String(i.priceTier)}).`)
    }

    const unitPrice = Math.round(Math.max(0, tierPrice))
    const discountRaw = Number(i.discount ?? 0)
    const discount = Math.round(Math.max(0, Math.min(discountRaw, unitPrice)))

    return {
      ...i,
      sku,
      unitPrice,
      discount,
      warehouseId: resolveWarehouseId(state, i.warehouseId ?? input.warehouseId),
    }
  })

  const totalsForDiscount = computePosTotals({
    items: resolvedItems.map((i) => ({
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      priceTier: i.priceTier,
    })),
    orderDiscount: Math.max(0, Number(input.orderDiscount) || 0),
  })

  const orderDiscountApplied = totalsForDiscount.orderDiscountApplied

  const createdAt = nowIso()
  const draftRes = createSalesDraft({
    branchId: input.branchId,
    createdAt,
    createdBy: input.postedBy,
    salespersonName: input.salespersonName,
    paymentStatus: input.paymentStatus,
    paidAmount: input.paidAmount,
    dueDate: input.dueDate,
    orderDiscount: orderDiscountApplied,
    customerName: input.customerName,
    customerAddress: input.customerAddress,
    customerPhone: input.customerPhone,
    items: resolvedItems,
  })

  if (!draftRes.ok) {
    const e = draftRes.error
    throw new Error(`DOMAIN:${e.code}:${e.message}`)
  }

  const postedRes = postSales({
    doc: draftRes.value,
    ledger: state.ledger,
    postedAt: nowIso(),
    postedBy: input.postedBy,
    // Keep as fallback only; per-line warehouseId will be used when present.
    warehouseId: input.warehouseId ? resolveWarehouseId(state, input.warehouseId) : undefined,
    allowNegativeStock: input.allowNegativeStock,
  })

  if (!postedRes.ok) {
    const e = postedRes.error
    throw new Error(`DOMAIN:${e.code}:${e.message}`)
  }

  state.ledger = appendLedger(state.ledger, postedRes.value.newEntries)
  state.sales.unshift(postedRes.value.doc)

  autoCreateMovementsFromEntries({
    state,
    sourceType: "SALES",
    docId: postedRes.value.doc.id,
    entries: postedRes.value.newEntries,
    operator: input.postedBy,
  })

  return { doc: postedRes.value.doc, newEntries: postedRes.value.newEntries }
}

export function getSales(branchId: string): SalesDocument[] {
  const state = ensureBranchState(branchId)
  return deepClone(state.sales)
}

export function getSale(branchId: string, saleId: string): SalesDocument {
  const state = ensureBranchState(branchId)
  const id = (saleId ?? "").trim()
  if (!id) throw new Error("INVALID_SALE_ID")
  const doc = state.sales.find((s) => s.id === id)
  if (!doc) throw new Error("SALE_NOT_FOUND")
  return deepClone(doc)
}

export function voidSale(input: { branchId: string; saleId: string; voidedBy: string }): SalesDocument {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)
  const id = (input.saleId ?? "").trim()
  if (!id) throw new Error("INVALID_SALE_ID")

  const doc = state.sales.find((s) => s.id === id)
  if (!doc) throw new Error("SALE_NOT_FOUND")
  if (doc.status === "VOID") return deepClone(doc)

  if (doc.status === "POSTED") {
    const now = nowIso()
    const reversalEntries: StockLedgerEntry[] = doc.items.map((item) => ({
      id: defaultIdFactory(),
      branchId: doc.branchId,
      warehouseId: resolveWarehouseId(
        state,
        (item as unknown as { warehouseId?: string }).warehouseId ?? (doc as unknown as { warehouseId?: string }).warehouseId
      ),
      sku: item.sku,
      qtyDelta: Math.abs(Math.trunc(Number(item.quantity) || 0)),
      reason: "Sales VOID",
      sourceDocumentType: "SALES",
      sourceDocumentId: doc.id,
      sourceLineId: item.id,
      createdAt: now,
      createdBy: input.voidedBy,
    }))

    state.ledger = appendLedger(state.ledger, reversalEntries)
  }

  autoVoidLinkedMovements({
    state,
    sourceType: "SALES",
    docId: doc.id,
    operator: input.voidedBy,
    reason: "Sales VOID",
  })

  doc.status = "VOID"
  doc.postedBy = input.voidedBy
  return deepClone(doc)
}

export function getWarehouse(branchId: string): BranchWarehouseData {
  const state = ensureBranchState(branchId)

  // Keep layout & movement history consistent even if data got out-of-sync
  // (e.g. zones cleared before sync rules existed).
  const zones = state.warehouse.zones ?? []
  const zoneIds = new Set(zones.map((z) => z.id))
  if (zoneIds.size === 0) {
    state.warehouse.movements = []
  } else {
    const isValidLocation = (loc: string) => {
      if (loc === "Receiving" || loc === "Staging") return true
      if (zoneIds.has(loc)) return true
      const parsed = parseConditionWarehouseId(loc)
      return Boolean(parsed && zoneIds.has(parsed.baseZoneId))
    }
    state.warehouse.movements = (state.warehouse.movements ?? []).filter(
      (m) => isValidLocation(m.fromLocation) && isValidLocation(m.toLocation)
    )
  }

  // Normalize legacy records: infer status from void metadata.
  for (const m of state.warehouse.movements ?? []) {
    const hasVoidMeta =
      Boolean((m.voidedAt ?? "").trim()) || Boolean((m.voidedBy ?? "").trim()) || Boolean((m.voidReason ?? "").trim())
    if (hasVoidMeta) {
      m.status = "VOID"
    } else {
      m.status = m.status === "VOID" ? "POSTED" : (m.status ?? "POSTED")
    }
  }

  return deepClone(state.warehouse)
}

export function getDefaultWarehouseZoneId(branchId: string): string {
  const state = ensureBranchState(branchId)
  ensureDefaultWarehouseId(state)

  const candidate = (state.defaultWarehouseId ?? "").trim()
  const zones = (state.warehouse.zones ?? []).filter((z) => z.active !== false && !legacyConditionFromZoneName(z.name))
  const zoneIdSet = new Set(zones.map((z) => z.id))

  if (candidate && candidate !== "Receiving" && candidate !== "Staging" && zoneIdSet.has(candidate)) return candidate
  return zones[0]?.id ?? ""
}

export type WarehouseZoneStockLine = {
  sku: string
  normalQty: number
  damagedQty: number
  expiredQty: number
  totalQty: number
}

export type WarehouseZoneStockSummary = Record<string, WarehouseZoneStockLine[]>

export type ProductZoneBalanceLine = {
  zoneId: string
  zoneName: string
  normalQty: number
}

export type ProductZoneBalance = {
  sku: string
  totalNormalQty: number
  isMultiZone: boolean
  primaryPickWarehouseId?: string
  lines: ProductZoneBalanceLine[]
}

export function getWarehouseZoneStockSummary(branchId: string): WarehouseZoneStockSummary {
  const state = ensureBranchState(branchId)
  ensureDefaultWarehouseId(state)

  const zones = (state.warehouse.zones ?? []).filter((z) => z.active !== false)
  const zoneIds = zones.map((z) => z.id)
  const zoneIdSet = new Set(zoneIds)

  const legacyDamagedZoneIds = new Set(
    zones.filter((z) => legacyConditionFromZoneName(z.name) === "DAMAGED").map((z) => z.id)
  )
  const legacyExpiredZoneIds = new Set(
    zones.filter((z) => legacyConditionFromZoneName(z.name) === "EXPIRED").map((z) => z.id)
  )

  const mappedLegacyZoneTarget = isZoneId(state, state.defaultWarehouseId) ? state.defaultWarehouseId : (zoneIds[0] ?? "")

  const skuByZone = new Map<string, Set<string>>()
  for (const zoneId of zoneIds) skuByZone.set(zoneId, new Set())

  for (const e of state.ledger ?? []) {
    const sku = (e.sku ?? "").trim()
    if (!sku) continue
    const wid = (e.warehouseId ?? "").trim()
    if (!wid) continue

    if (zoneIdSet.has(wid)) {
      skuByZone.get(wid)?.add(sku)
      continue
    }

    const parsed = parseConditionWarehouseId(wid)
    if (parsed && zoneIdSet.has(parsed.baseZoneId)) {
      skuByZone.get(parsed.baseZoneId)?.add(sku)
      continue
    }

    if (mappedLegacyZoneTarget) {
      if (legacyDamagedZoneIds.has(wid)) {
        skuByZone.get(mappedLegacyZoneTarget)?.add(sku)
      }
      if (legacyExpiredZoneIds.has(wid)) {
        skuByZone.get(mappedLegacyZoneTarget)?.add(sku)
      }
    }
  }

  const out: WarehouseZoneStockSummary = {}
  for (const zoneId of zoneIds) {
    const skus = Array.from(skuByZone.get(zoneId) ?? []).sort((a, b) => a.localeCompare(b))
    const lines: WarehouseZoneStockLine[] = []
    for (const sku of skus) {
      const normalQty = getOnHandQty(state.ledger, { branchId: state.branchId, sku, warehouseId: zoneId })
      const damagedQtyInternal = getOnHandQty(state.ledger, {
        branchId: state.branchId,
        sku,
        warehouseId: conditionWarehouseId(zoneId, "DAMAGED"),
      })
      const expiredQtyInternal = getOnHandQty(state.ledger, {
        branchId: state.branchId,
        sku,
        warehouseId: conditionWarehouseId(zoneId, "EXPIRED"),
      })

      const damagedQtyLegacy =
        zoneId === mappedLegacyZoneTarget
          ? Array.from(legacyDamagedZoneIds).reduce(
              (sum, legacyId) => sum + getOnHandQty(state.ledger, { branchId: state.branchId, sku, warehouseId: legacyId }),
              0
            )
          : 0
      const expiredQtyLegacy =
        zoneId === mappedLegacyZoneTarget
          ? Array.from(legacyExpiredZoneIds).reduce(
              (sum, legacyId) => sum + getOnHandQty(state.ledger, { branchId: state.branchId, sku, warehouseId: legacyId }),
              0
            )
          : 0

      const damagedQty = damagedQtyInternal + damagedQtyLegacy
      const expiredQty = expiredQtyInternal + expiredQtyLegacy

      const totalQty = normalQty + damagedQty + expiredQty
      if (totalQty <= 0) continue
      lines.push({ sku, normalQty, damagedQty, expiredQty, totalQty })
    }
    out[zoneId] = lines
  }
  return deepClone(out)
}

export function getProductZoneBalances(input: {
  branchId: string
  sku?: string
}): ProductZoneBalance[] {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)

  const summary = getWarehouseZoneStockSummary(input.branchId)
  const activeZones = (state.warehouse.zones ?? []).filter((z) => z.active !== false)

  const wantedSku = (input.sku ?? "").trim().toLowerCase()
  const masterProducts = (state.products ?? []).filter((p) => p.active !== false)

  const allSkus = new Set<string>()
  for (const p of masterProducts) {
    const sku = (p.sku ?? "").trim()
    if (sku) allSkus.add(sku)
  }
  for (const lines of Object.values(summary)) {
    if (!Array.isArray(lines)) continue
    for (const line of lines) {
      const sku = (line?.sku ?? "").trim()
      if (sku) allSkus.add(sku)
    }
  }

  const balances: ProductZoneBalance[] = []

  for (const sku of Array.from(allSkus).sort((a, b) => a.localeCompare(b, "id"))) {
    if (wantedSku && sku.toLowerCase() !== wantedSku) continue

    const lines: ProductZoneBalanceLine[] = []
    for (const zone of activeZones) {
      const zoneLines = summary[zone.id] ?? []
      const found = zoneLines.find((l) => (l.sku ?? "").trim().toLowerCase() === sku.toLowerCase())
      const normalQty = Math.max(0, Math.trunc(Number(found?.normalQty ?? 0)))
      if (normalQty <= 0) continue
      lines.push({ zoneId: zone.id, zoneName: zone.name, normalQty })
    }

    const totalNormalQty = lines.reduce((sum, l) => sum + l.normalQty, 0)
    const isMultiZone = lines.length > 1

    const ranked = [...lines].sort((a, b) => {
      if (b.normalQty !== a.normalQty) return b.normalQty - a.normalQty
      return a.zoneId.localeCompare(b.zoneId, "id")
    })

    const primaryPickWarehouseId = ranked[0]?.zoneId

    balances.push({
      sku,
      totalNormalQty,
      isMultiZone,
      primaryPickWarehouseId,
      lines: ranked,
    })
  }

  return deepClone(balances)
}

export function getWarehouseMovementsPaged(input: {
  branchId: string
  page?: number
  limit?: number
}): { items: StockMovement[]; total: number; page: number; limit: number } {
  const state = ensureBranchState(input.branchId)
  ensureDefaultWarehouseId(state)

  const limitRaw = Number(input.limit)
  const pageRaw = Number(input.page)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.trunc(limitRaw))) : 5
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1

  const all = Array.isArray(state.warehouse.movements) ? state.warehouse.movements : []
  const total = all.length
  const offset = (page - 1) * limit
  const items = all.slice(offset, offset + limit)

  return { items: deepClone(items), total, page, limit }
}

export function getWarehouseZoneStockLines(branchId: string, zoneId: string): WarehouseZoneStockLine[] {
  const summary = getWarehouseZoneStockSummary(branchId)
  return deepClone(summary[zoneId] ?? [])
}

export function getWarehouseZoneStockLinesPaged(input: {
  branchId: string
  zoneId: string
  q?: string
  page?: number
  limit?: number
}): { items: WarehouseZoneStockLine[]; total: number; page: number; limit: number } {
  const limitRaw = Number(input.limit)
  const pageRaw = Number(input.page)
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.trunc(limitRaw))) : 5
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1

  const lines = getWarehouseZoneStockLines(input.branchId, input.zoneId)
  const q = (input.q ?? "").trim().toLowerCase()
  const state = ensureBranchState(input.branchId)
  const productNameBySku = new Map(
    (state.products ?? []).map((p) => [String(p.sku ?? "").trim().toLowerCase(), String(p.name ?? "").trim()] as const)
  )

  const filtered = q
    ? lines.filter((line) => {
        const sku = String(line.sku ?? "").trim().toLowerCase()
        if (!sku) return false
        const productName = (productNameBySku.get(sku) ?? "").toLowerCase()
        return sku.includes(q) || productName.includes(q)
      })
    : lines
  const total = filtered.length
  const offset = (page - 1) * limit
  const items = filtered.slice(offset, offset + limit).map((line) => {
    const skuKey = String(line.sku ?? "").trim().toLowerCase()
    const name = productNameBySku.get(skuKey)
    return {
      ...line,
      name: name && name.length > 0 ? name : undefined,
    }
  })

  return { items, total, page, limit }
}


export function addWarehouseZone(input: {
  branchId: string
  name: string
  status?: WarehouseZone["status"]
}): WarehouseZone {
  const state = ensureBranchState(input.branchId)

  const name = (input.name ?? "").trim()
  if (!name) throw new Error("DOMAIN:INVALID_INPUT:name wajib.")

  const target = normalizeZoneName(name)
  const existing = (state.warehouse.zones ?? []).find((z) => normalizeZoneName(z.name) === target)
  if (existing) {
    existing.active = true
    if (input.status !== undefined) existing.status = input.status
    ensureDefaultWarehouseId(state)
    return deepClone(existing)
  }

  const zones = state.warehouse.zones ?? []
  const prefix = zonePrefixFromBranchCode(state.branchCode)
  const zone: WarehouseZone = {
    id: makeNewZoneId(zones, `${prefix}`),
    name,
    status: input.status ?? "Aktif",
    active: true,
  }

  state.warehouse.zones = [...zones, zone]
  ensureDefaultWarehouseId(state)
  return deepClone(zone)
}

export function deleteWarehouseZone(branchId: string, zoneId: string): void {
  const state = ensureBranchState(branchId)
  const zoneIndex = state.warehouse.zones.findIndex((z) => z.id === zoneId)
  
  if (zoneIndex === -1) {
    throw new Error("ZONE_NOT_FOUND")
  }

  const activeZones = (state.warehouse.zones ?? []).filter((z) => z.active !== false)
  const isTargetActive = activeZones.some((z) => z.id === zoneId)
  if (isTargetActive && activeZones.length <= 1) {
    throw new Error("CANNOT_DELETE_LAST_ACTIVE_ZONE")
  }

  const balances = computeZoneItemBalances(state.warehouse)
  if ((balances.get(zoneId)?.size ?? 0) > 0) {
    throw new Error("ZONE_NOT_EMPTY")
  }

  const referencedByMovements = (state.warehouse.movements ?? []).some(
    (m) => m.fromLocation === zoneId || m.toLocation === zoneId
  )
  const referencedByLedger = (state.ledger ?? []).some((e) => {
    try {
      // resolveWarehouseId enforces current validity; for this check we only want equality.
      return (e.warehouseId ?? "").trim() === zoneId
    } catch {
      return false
    }
  })
  const isUsed = referencedByMovements || referencedByLedger

  if (isUsed) {
    // Soft delete: keep zone record for history/audit.
    const zone = state.warehouse.zones[zoneIndex]!
    zone.active = false
  } else {
    // Hard delete only if never used.
    state.warehouse.zones.splice(zoneIndex, 1)
  }

  ensureDefaultWarehouseId(state)
}

export function updateWarehouseZone(input: {
  branchId: string
  zoneId: string
  name?: string
  status?: WarehouseZone["status"]
}): WarehouseZone {
  const state = ensureBranchState(input.branchId)
  const zone = state.warehouse.zones.find((z) => z.id === input.zoneId)
  
  if (!zone) {
    throw new Error("ZONE_NOT_FOUND")
  }

  // Any update implies re-activation.
  zone.active = true

  if (input.name !== undefined) zone.name = input.name
  if (input.status !== undefined) zone.status = input.status

  return zone
}

export function addWarehouseMovement(input: {
  branchId: string
  item: string
  type: StockMovement["type"]
  quantity: number
  fromLocation: string
  toLocation: string
  operator: string

  sourceDocumentType?: string
  sourceDocumentId?: string

  reason?: string
  note?: string
}): StockMovement {
  const state = ensureBranchState(input.branchId)
  const prefix = movementPrefixFromBranchCode(state.branchCode)

  const item = (input.item ?? "").trim()
  if (!item) throw new Error("DOMAIN:INVALID_INPUT:Item wajib.")

  const operator = (input.operator ?? "").trim()
  if (!operator) throw new Error("DOMAIN:INVALID_INPUT:operator wajib.")

  const qtyRaw = Number(input.quantity)
  const qty = Math.trunc(qtyRaw)
  if (!Number.isFinite(qtyRaw) || qty <= 0) throw new Error("DOMAIN:INVALID_INPUT:Quantity harus > 0.")

  const fromLocation = (input.fromLocation ?? "").trim()
  const toLocation = (input.toLocation ?? "").trim()
  if (!fromLocation) throw new Error("DOMAIN:INVALID_INPUT:fromLocation wajib.")
  if (!toLocation) throw new Error("DOMAIN:INVALID_INPUT:toLocation wajib.")
  if (fromLocation === toLocation) throw new Error("DOMAIN:INVALID_INPUT:Lokasi asal dan tujuan tidak boleh sama.")
  if (!isValidWarehouseLocation(state, fromLocation) || !isValidWarehouseLocation(state, toLocation)) {
    throw new Error("DOMAIN:INVALID_INPUT:Lokasi gudang tidak valid.")
  }

  if (input.type === "Masuk") {
    if (fromLocation !== "Receiving") {
      throw new Error("DOMAIN:INVALID_INPUT:Movement Masuk harus berasal dari Receiving.")
    }
    if (!isZoneId(state, toLocation)) {
      throw new Error("DOMAIN:INVALID_INPUT:Movement Masuk harus menuju zona gudang.")
    }
  } else if (input.type === "Keluar") {
    const parsedFrom = parseConditionWarehouseId(fromLocation)
    const fromIsZone = isZoneId(state, fromLocation)
    const fromIsConditionInZone = Boolean(
      parsedFrom && isZoneId(state, parsedFrom.baseZoneId) && (parsedFrom.condition === "DAMAGED" || parsedFrom.condition === "EXPIRED")
    )

    if (!fromIsZone && !fromIsConditionInZone) {
      throw new Error("DOMAIN:INVALID_INPUT:Movement Keluar harus berasal dari zona gudang atau stok Rusak/Kadaluarsa.")
    }
    if (toLocation !== "Staging") {
      throw new Error("DOMAIN:INVALID_INPUT:Movement Keluar harus menuju Staging.")
    }
  } else if (input.type === "Pindah") {
    const parsedFrom = parseConditionWarehouseId(fromLocation)
    const fromIsConditionInZone = Boolean(
      parsedFrom && isZoneId(state, parsedFrom.baseZoneId) && (parsedFrom.condition === "DAMAGED" || parsedFrom.condition === "EXPIRED")
    )

    const parsedTo = parseConditionWarehouseId(toLocation)
    const toIsConditionInZone = Boolean(
      parsedTo && isZoneId(state, parsedTo.baseZoneId) && (parsedTo.condition === "DAMAGED" || parsedTo.condition === "EXPIRED")
    )

    const isZoneToZone = isZoneId(state, fromLocation) && isZoneId(state, toLocation)
    const isZoneToCondition = isZoneId(state, fromLocation) && Boolean(parsedTo && parsedTo.baseZoneId === fromLocation) && toIsConditionInZone
    const isConditionToZone =
      fromIsConditionInZone && isZoneId(state, toLocation) && Boolean(parsedFrom && parsedFrom.baseZoneId === toLocation)

    if (!isZoneToZone && !isZoneToCondition && !isConditionToZone) {
      throw new Error(
        "DOMAIN:INVALID_INPUT:Movement Pindah hanya boleh antar zona gudang, atau penandaan rusak/kadaluarsa di zona yang sama."
      )
    }
  }

  // Perubahan isi zona dihitung dari riwayat movement.

  const d = new Date()
  const date = d.toISOString().slice(0, 10)
  const time = d.toTimeString().slice(0, 5)

  const movement: StockMovement = {
    id: makeNewMovementId(state.warehouse.movements, prefix),
    date,
    time,
    item,
    type: input.type,
    quantity: qty,
    fromLocation,
    toLocation,
    operator,
    sourceDocumentType: (input.sourceDocumentType ?? "").trim() || undefined,
    sourceDocumentId: (input.sourceDocumentId ?? "").trim() || undefined,
    reason: (input.reason ?? "").trim() || undefined,
    note: (input.note ?? "").trim() || undefined,
    status: "POSTED",
  }

  state.warehouse.movements = [movement, ...state.warehouse.movements]
  return movement
}

export function voidWarehouseMovement(input: {
  branchId: string
  movementId: string
  reason: string
  operator: string
}): StockMovement {
  const state = ensureBranchState(input.branchId)
  const movement = state.warehouse.movements.find((m) => m.id === input.movementId)
  if (!movement) {
    throw new Error("MOVEMENT_NOT_FOUND")
  }

  if (movement.status === "VOID") {
    throw new Error("MOVEMENT_ALREADY_VOID")
  }

  // Tidak perlu reverse state lain: saldo isi zona dihitung dari movement yang tidak VOID.

  const now = new Date()
  movement.status = "VOID"
  movement.voidedAt = now.toISOString()
  movement.voidedBy = input.operator
  movement.voidReason = (input.reason ?? "").trim() || "VOID"

  return movement
}
