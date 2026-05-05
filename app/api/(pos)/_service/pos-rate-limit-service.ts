import { resolveClientIpFromRequest } from "@/lib/http/client-ip"

type PosRateLimitScope = "POS_SALES_POST"

type PosRateLimitInput = {
  scope: PosRateLimitScope
  clientIp: string
  actorUserId?: string
  actorRole?: string
  branch?: string
}

type RateEntry = {
  count: number
  windowStartedAt: number
}

const SCOPE_POLICY: Record<PosRateLimitScope, { max: number; windowMs: number }> = {
  POS_SALES_POST: { max: 45, windowMs: 60_000 },
}

const DEFAULT_STORE_MAX_ENTRIES = 5_000
const DEFAULT_GC_AGE_MS = 10 * 60_000

const globalRateLimitStore = globalThis as typeof globalThis & {
  __erpPosRateLimitStore?: Map<string, RateEntry>
}

function getStore() {
  if (!globalRateLimitStore.__erpPosRateLimitStore) {
    globalRateLimitStore.__erpPosRateLimitStore = new Map<string, RateEntry>()
  }
  return globalRateLimitStore.__erpPosRateLimitStore
}

function nowMs() {
  return Date.now()
}

function resolveStoreMaxEntries() {
  const raw = Number(process.env.POS_RATE_LIMIT_MAX_ENTRIES ?? String(DEFAULT_STORE_MAX_ENTRIES))
  if (!Number.isFinite(raw)) return DEFAULT_STORE_MAX_ENTRIES
  return Math.max(1, Math.trunc(raw))
}

function resolveGcAgeMs() {
  const raw = Number(process.env.POS_RATE_LIMIT_GC_AGE_MS ?? String(DEFAULT_GC_AGE_MS))
  if (!Number.isFinite(raw)) return DEFAULT_GC_AGE_MS
  return Math.max(60_000, Math.trunc(raw))
}

function gcStore(store: Map<string, RateEntry>, now: number, gcAgeMs: number) {
  for (const [key, row] of store.entries()) {
    if (now - row.windowStartedAt > gcAgeMs) {
      store.delete(key)
    }
  }
}

function evictOverflow(store: Map<string, RateEntry>, maxEntries: number) {
  while (store.size > maxEntries) {
    const oldestKey = store.keys().next().value
    if (!oldestKey) break
    store.delete(oldestKey)
  }
}

function normalizeIp(value: string) {
  const raw = String(value ?? "").trim()
  if (!raw) return "unknown"
  const fromForwarded = raw.split(",")[0]?.trim()
  return fromForwarded || "unknown"
}

function normalizeKeySegment(value: string | undefined, fallback: string) {
  const raw = String(value ?? "").trim().toLowerCase()
  if (!raw) return fallback
  const normalized = raw
    .replace(/\|/g, "_")
    .replace(/[^a-z0-9:._-]/g, "_")
    .slice(0, 80)
  return normalized || fallback
}

function buildRateLimitKey(input: PosRateLimitInput) {
  return [
    input.scope,
    `ip:${normalizeKeySegment(normalizeIp(input.clientIp), "unknown")}`,
    `u:${normalizeKeySegment(input.actorUserId, "anon")}`,
    `r:${normalizeKeySegment(input.actorRole, "none")}`,
    `b:${normalizeKeySegment(input.branch, "none")}`,
  ].join("|")
}

export function getPosClientIp(request: Request) {
  return resolveClientIpFromRequest(request, {
    trustProxyEnvKeys: ["POS_TRUST_PROXY_HEADERS", "TRUST_PROXY_HEADERS"],
    trustedProxyCidrsEnvKeys: ["POS_TRUSTED_PROXY_CIDRS", "TRUSTED_PROXY_CIDRS"],
    fallbackIp: "unknown",
  })
}

export function consumePosSalesRateLimit(input: PosRateLimitInput) {
  const policy = SCOPE_POLICY[input.scope]
  const now = nowMs()

  const store = getStore()
  gcStore(store, now, resolveGcAgeMs())
  const key = buildRateLimitKey(input)

  const existing = store.get(key)
  if (!existing || now - existing.windowStartedAt >= policy.windowMs) {
    store.delete(key)
    store.set(key, { count: 1, windowStartedAt: now })
    evictOverflow(store, resolveStoreMaxEntries())
    return { ok: true as const }
  }

  if (existing.count >= policy.max) {
    const retryAfterSec = Math.max(1, Math.ceil((policy.windowMs - (now - existing.windowStartedAt)) / 1000))
    return { ok: false as const, retryAfterSec }
  }

  existing.count += 1
  store.delete(key)
  store.set(key, existing)
  evictOverflow(store, resolveStoreMaxEntries())
  return { ok: true as const }
}