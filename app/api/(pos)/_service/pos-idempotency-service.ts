type PosIdempotencyScope = "POS_SALES_POST"

type PosIdempotencyNamespace = {
  branch?: string
  actorUserId?: string
  actorRole?: string
  clientIp?: string
}

type StoredResponse = {
  fingerprint: string
  status: number
  body: string
  headers: Record<string, string>
  createdAt: number
}

type Snapshot = {
  status: number
  body: string
  headers: Record<string, string>
}

type PendingSnapshot = {
  promise: Promise<Snapshot>
  startedAt: number
}

const DEFAULT_ENTRY_TTL_MS = 6 * 60 * 60 * 1000
const DEFAULT_PENDING_TTL_MS = 2 * 60 * 1000
const DEFAULT_MAX_STORE_ENTRIES = 5_000
const DEFAULT_MAX_PENDING_ENTRIES = 1_000

const globalIdempotencyStore = globalThis as typeof globalThis & {
  __erpPosIdempotencyStore?: Map<string, StoredResponse>
  __erpPosIdempotencyPending?: Map<string, PendingSnapshot>
}

function getStore() {
  if (!globalIdempotencyStore.__erpPosIdempotencyStore) {
    globalIdempotencyStore.__erpPosIdempotencyStore = new Map<string, StoredResponse>()
  }
  return globalIdempotencyStore.__erpPosIdempotencyStore
}

function getPendingStore() {
  if (!globalIdempotencyStore.__erpPosIdempotencyPending) {
    globalIdempotencyStore.__erpPosIdempotencyPending = new Map<string, PendingSnapshot>()
  }
  return globalIdempotencyStore.__erpPosIdempotencyPending
}

function nowMs() {
  return Date.now()
}

function resolveEntryTtlMs() {
  const raw = Number(process.env.POS_IDEMPOTENCY_TTL_MS ?? String(DEFAULT_ENTRY_TTL_MS))
  if (!Number.isFinite(raw)) return DEFAULT_ENTRY_TTL_MS
  return Math.max(60_000, Math.trunc(raw))
}

function resolvePendingTtlMs() {
  const raw = Number(process.env.POS_IDEMPOTENCY_PENDING_TTL_MS ?? String(DEFAULT_PENDING_TTL_MS))
  if (!Number.isFinite(raw)) return DEFAULT_PENDING_TTL_MS
  return Math.max(5_000, Math.trunc(raw))
}

function resolveMaxStoreEntries() {
  const raw = Number(process.env.POS_IDEMPOTENCY_MAX_ENTRIES ?? String(DEFAULT_MAX_STORE_ENTRIES))
  if (!Number.isFinite(raw)) return DEFAULT_MAX_STORE_ENTRIES
  return Math.max(1, Math.trunc(raw))
}

function resolveMaxPendingEntries() {
  const raw = Number(process.env.POS_IDEMPOTENCY_MAX_PENDING_ENTRIES ?? String(DEFAULT_MAX_PENDING_ENTRIES))
  if (!Number.isFinite(raw)) return DEFAULT_MAX_PENDING_ENTRIES
  return Math.max(1, Math.trunc(raw))
}

function cleanupStore(store: Map<string, StoredResponse>, now: number, entryTtlMs: number) {
  for (const [key, value] of store.entries()) {
    if (now - value.createdAt > entryTtlMs) {
      store.delete(key)
    }
  }
}

function cleanupPendingStore(pending: Map<string, PendingSnapshot>, now: number, pendingTtlMs: number) {
  for (const [key, value] of pending.entries()) {
    if (now - value.startedAt > pendingTtlMs) {
      pending.delete(key)
    }
  }
}

function evictOverflow(store: Map<string, StoredResponse>, maxEntries: number) {
  while (store.size > maxEntries) {
    const oldestKey = store.keys().next().value
    if (!oldestKey) break
    store.delete(oldestKey)
  }
}

function normalizeKey(raw: string | null): string {
  return String(raw ?? "").trim()
}

function normalizeIp(value: string | undefined) {
  const raw = String(value ?? "").trim()
  if (!raw) return "unknown"
  const fromForwarded = raw.split(",")[0]?.trim()
  return fromForwarded || "unknown"
}

function normalizeStoreSegment(value: string | undefined, fallback: string, maxLength: number) {
  const raw = String(value ?? "").trim()
  if (!raw) return fallback
  const normalized = raw
    .replace(/\|/g, "%7C")
    .replace(/\s+/g, " ")
    .slice(0, maxLength)
  return normalized || fallback
}

function buildStoreKey(input: {
  scope: PosIdempotencyScope
  key: string
  namespace?: PosIdempotencyNamespace
}) {
  const namespace = input.namespace ?? {}

  return [
    input.scope,
    `k:${normalizeStoreSegment(input.key, "missing", 160)}`,
    `u:${normalizeStoreSegment(namespace.actorUserId, "anon", 80)}`,
    `r:${normalizeStoreSegment(namespace.actorRole, "none", 40).toLowerCase()}`,
    `b:${normalizeStoreSegment(namespace.branch, "none", 80)}`,
    `ip:${normalizeStoreSegment(normalizeIp(namespace.clientIp), "unknown", 80)}`,
  ].join("|")
}

function jsonErrorResponse(status: number, code: string, message: string) {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    }
  )
}

function pickHeaders(response: Response): Record<string, string> {
  const out: Record<string, string> = {}
  const keys = ["content-type", "cache-control", "retry-after"]
  for (const key of keys) {
    const value = response.headers.get(key)
    if (!value) continue
    out[key] = value
  }
  return out
}

async function snapshotResponse(response: Response): Promise<Snapshot> {
  return {
    status: response.status,
    body: await response.clone().text(),
    headers: pickHeaders(response),
  }
}

function toResponse(snapshot: Snapshot): Response {
  return new Response(snapshot.body, {
    status: snapshot.status,
    headers: snapshot.headers,
  })
}

function readIdempotencyKey(request: Request): string {
  return normalizeKey(request.headers.get("Idempotency-Key"))
}

export function ensurePosIdempotencyKey(request: Request): { ok: true; key: string } | { ok: false; response: Response } {
  const key = readIdempotencyKey(request)
  if (!key) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Idempotency-Key wajib untuk operasi checkout POS." } }),
        {
          status: 400,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }
      ),
    }
  }

  if (key.length > 128) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Idempotency-Key terlalu panjang." } }),
        {
          status: 400,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }
      ),
    }
  }

  return { ok: true, key }
}

export async function runPosIdempotent(input: {
  scope: PosIdempotencyScope
  key: string
  fingerprint: string
  namespace?: PosIdempotencyNamespace
  run: () => Promise<Response>
}): Promise<Response> {
  const store = getStore()
  const pending = getPendingStore()
  const now = nowMs()
  cleanupStore(store, now, resolveEntryTtlMs())
  cleanupPendingStore(pending, now, resolvePendingTtlMs())

  const storeKey = buildStoreKey(input)
  const existing = store.get(storeKey)
  if (existing) {
    if (existing.fingerprint !== input.fingerprint) {
      return jsonErrorResponse(409, "CONFLICT", "Idempotency-Key sudah digunakan untuk request berbeda.")
    }

    return toResponse(existing)
  }

  const inFlight = pending.get(storeKey)
  if (inFlight) {
    const replay = await inFlight.promise
    return toResponse(replay)
  }

  if (pending.size >= resolveMaxPendingEntries()) {
    return jsonErrorResponse(
      429,
      "TOO_MANY_REQUESTS",
      "Terlalu banyak request idempotent checkout POS yang sedang diproses. Coba lagi sebentar."
    )
  }

  const promise = (async () => {
    const response = await input.run()
    const snap = await snapshotResponse(response)

    if (snap.status < 500) {
      store.set(storeKey, {
        fingerprint: input.fingerprint,
        status: snap.status,
        body: snap.body,
        headers: snap.headers,
        createdAt: nowMs(),
      })
      evictOverflow(store, resolveMaxStoreEntries())
    }

    return snap
  })()

  pending.set(storeKey, { promise, startedAt: now })

  try {
    const snap = await promise
    return toResponse(snap)
  } finally {
    pending.delete(storeKey)
  }
}