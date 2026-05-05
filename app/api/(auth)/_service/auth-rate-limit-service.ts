import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js"

type LoginThrottleEntry = {
  failureCount: number
  firstFailureAt: number
  blockedUntil: number
  lastSeenAt: number
}

type LoginThrottleKeyInput = {
  email: string
  clientIp: string
}

type LoginThrottleScope = "pair" | "email" | "ip"

type LoginThrottlePolicy = {
  maxFailures: number
  failureWindowMs: number
  blockMs: number
}

const DEFAULT_GC_TTL_MS = 60 * 60 * 1000
const DEFAULT_GC_INTERVAL_MS = 30 * 1000
const DEFAULT_STORE_MAX_ENTRIES = 5_000

const LOGIN_THROTTLE_POLICIES: Readonly<Record<LoginThrottleScope, LoginThrottlePolicy>> = Object.freeze({
  pair: {
    maxFailures: 5,
    failureWindowMs: 10 * 60 * 1000,
    blockMs: 5 * 60 * 1000,
  },
  email: {
    maxFailures: 12,
    failureWindowMs: 10 * 60 * 1000,
    blockMs: 10 * 60 * 1000,
  },
  ip: {
    maxFailures: 30,
    failureWindowMs: 5 * 60 * 1000,
    blockMs: 10 * 60 * 1000,
  },
})

const globalAuthRateLimitStore = globalThis as typeof globalThis & {
  __erpAuthLoginThrottleStore?: Map<string, LoginThrottleEntry>
  __erpAuthLoginThrottleLastGcAt?: number
}

function getStore() {
  if (!globalAuthRateLimitStore.__erpAuthLoginThrottleStore) {
    globalAuthRateLimitStore.__erpAuthLoginThrottleStore = new Map<string, LoginThrottleEntry>()
  }
  return globalAuthRateLimitStore.__erpAuthLoginThrottleStore
}

function getLastGcAt() {
  return globalAuthRateLimitStore.__erpAuthLoginThrottleLastGcAt ?? 0
}

function setLastGcAt(value: number) {
  globalAuthRateLimitStore.__erpAuthLoginThrottleLastGcAt = value
}

function nowMs() {
  return Date.now()
}

function normalizeEmail(value: string) {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeClientIp(value: string) {
  return String(value ?? "").trim() || "unknown"
}

function resolveGcTtlMs() {
  const raw = Number(process.env.AUTH_LOGIN_THROTTLE_GC_AGE_MS ?? String(DEFAULT_GC_TTL_MS))
  if (!Number.isFinite(raw)) return DEFAULT_GC_TTL_MS
  return Math.max(60_000, Math.trunc(raw))
}

function resolveGcIntervalMs() {
  const raw = Number(process.env.AUTH_LOGIN_THROTTLE_GC_INTERVAL_MS ?? String(DEFAULT_GC_INTERVAL_MS))
  if (!Number.isFinite(raw)) return DEFAULT_GC_INTERVAL_MS
  return Math.max(1_000, Math.trunc(raw))
}

function resolveStoreMaxEntries() {
  const raw = Number(process.env.AUTH_LOGIN_THROTTLE_MAX_ENTRIES ?? String(DEFAULT_STORE_MAX_ENTRIES))
  if (!Number.isFinite(raw)) return DEFAULT_STORE_MAX_ENTRIES
  return Math.max(1, Math.trunc(raw))
}

function hashMaterial(value: string): string {
  const digest = sha256(utf8ToBytes(value))
  return bytesToHex(digest)
}

function buildStoreKey(scope: LoginThrottleScope, keyMaterial: string): string {
  return `auth-login|${scope}|${hashMaterial(keyMaterial)}`
}

function buildScopeEntries(input: LoginThrottleKeyInput): Array<{ scope: LoginThrottleScope; keyMaterial: string }> {
  const email = normalizeEmail(input.email)
  const clientIp = normalizeClientIp(input.clientIp)

  const entries: Array<{ scope: LoginThrottleScope; keyMaterial: string }> = [
    { scope: "pair", keyMaterial: `${email}|${clientIp}` },
    { scope: "email", keyMaterial: email },
  ]

  if (clientIp !== "unknown") {
    entries.push({ scope: "ip", keyMaterial: clientIp })
  }

  return entries
}

function gcStore(store: Map<string, LoginThrottleEntry>, now: number, gcTtlMs: number) {
  for (const [key, row] of store.entries()) {
    if (row.blockedUntil > now) continue
    if (now - row.lastSeenAt <= gcTtlMs) continue
    store.delete(key)
  }
}

function maybeGcStore(store: Map<string, LoginThrottleEntry>, now: number) {
  if (now - getLastGcAt() < resolveGcIntervalMs()) return
  gcStore(store, now, resolveGcTtlMs())
  setLastGcAt(now)
}

function touchStoreEntry(store: Map<string, LoginThrottleEntry>, key: string, value: LoginThrottleEntry) {
  store.delete(key)
  store.set(key, value)
}

function evictOverflow(store: Map<string, LoginThrottleEntry>) {
  const maxEntries = resolveStoreMaxEntries()
  while (store.size > maxEntries) {
    const oldestKey = store.keys().next().value
    if (!oldestKey) break
    store.delete(oldestKey)
  }
}

export function readLoginThrottle(input: LoginThrottleKeyInput) {
  const store = getStore()
  const now = nowMs()
  maybeGcStore(store, now)

  let retryAfterSec = 0
  let blockedScope: LoginThrottleScope | null = null

  const scopeEntries = buildScopeEntries(input)
  for (const entry of scopeEntries) {
    const key = buildStoreKey(entry.scope, entry.keyMaterial)
    const row = store.get(key)
    if (!row) continue

    row.lastSeenAt = now
    touchStoreEntry(store, key, row)
    if (row.blockedUntil <= now) continue

    const scopeRetryAfterSec = Math.max(1, Math.ceil((row.blockedUntil - now) / 1000))
    if (scopeRetryAfterSec > retryAfterSec) {
      retryAfterSec = scopeRetryAfterSec
      blockedScope = entry.scope
    }
  }

  if (retryAfterSec > 0) {
    return { blocked: true as const, retryAfterSec, scope: blockedScope }
  }

  return { blocked: false as const, retryAfterSec: 0, scope: null as LoginThrottleScope | null }
}

export function registerLoginFailure(input: LoginThrottleKeyInput) {
  const store = getStore()
  const now = nowMs()
  maybeGcStore(store, now)

  let blocked = false
  let retryAfterSec = 0
  let blockedScope: LoginThrottleScope | null = null

  const scopeEntries = buildScopeEntries(input)
  for (const entry of scopeEntries) {
    const policy = LOGIN_THROTTLE_POLICIES[entry.scope]
    const key = buildStoreKey(entry.scope, entry.keyMaterial)
    const existing = store.get(key)

    if (!existing) {
      store.set(key, {
        failureCount: 1,
        firstFailureAt: now,
        blockedUntil: 0,
        lastSeenAt: now,
      })
      evictOverflow(store)
      continue
    }

    const withinWindow = now - existing.firstFailureAt <= policy.failureWindowMs
    const nextFailureCount = withinWindow ? existing.failureCount + 1 : 1

    existing.failureCount = nextFailureCount
    existing.firstFailureAt = withinWindow ? existing.firstFailureAt : now
    existing.lastSeenAt = now

    if (existing.failureCount < policy.maxFailures) {
      touchStoreEntry(store, key, existing)
      evictOverflow(store)
      continue
    }

    existing.blockedUntil = now + policy.blockMs
    existing.failureCount = 0

    const scopeRetryAfterSec = Math.max(1, Math.ceil(policy.blockMs / 1000))
    if (scopeRetryAfterSec >= retryAfterSec) {
      retryAfterSec = scopeRetryAfterSec
      blockedScope = entry.scope
    }
    touchStoreEntry(store, key, existing)
    evictOverflow(store)
    blocked = true
  }

  return {
    blocked: blocked as true | false,
    retryAfterSec,
    scope: blockedScope,
  }
}

export function clearLoginThrottle(input: LoginThrottleKeyInput) {
  const store = getStore()

  const scopeEntries = buildScopeEntries(input)
  for (const entry of scopeEntries) {
    if (entry.scope === "ip") continue

    const key = buildStoreKey(entry.scope, entry.keyMaterial)
    store.delete(key)
  }
}

export function resetLoginThrottleStoreForTests() {
  const store = getStore()
  store.clear()
  setLastGcAt(0)
}
