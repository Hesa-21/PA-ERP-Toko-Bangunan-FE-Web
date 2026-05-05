import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  ensurePosIdempotencyKey,
  runPosIdempotent,
} from "@/app/api/(pos)/_service/pos-idempotency-service"

type PosIdempotencyGlobals = typeof globalThis & {
  __erpPosIdempotencyStore?: Map<string, unknown>
  __erpPosIdempotencyPending?: Map<string, unknown>
}

function resetPosIdempotencyStores() {
  const scope = globalThis as PosIdempotencyGlobals
  scope.__erpPosIdempotencyStore = new Map<string, unknown>()
  scope.__erpPosIdempotencyPending = new Map<string, unknown>()
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason?: unknown) => void = () => {}
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn
    reject = rejectFn
  })
  return { promise, resolve, reject }
}

describe("pos idempotency service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetPosIdempotencyStores()
  })

  it("rejects missing idempotency key", async () => {
    const result = ensurePosIdempotencyKey(new Request("https://example.com/api/pos/sales"))

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.response.status).toBe(400)

    const payload = (await result.response.json()) as {
      error?: {
        message?: string
      }
    }

    expect(payload.error?.message).toContain("Idempotency-Key")
  })

  it("replays stored response for same namespace and fingerprint", async () => {
    const runSpy = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, saleId: "SALE-1" }), {
        status: 201,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      })
    )

    const first = await runPosIdempotent({
      scope: "POS_SALES_POST",
      key: "pos-key-1",
      fingerprint: "fingerprint-a",
      namespace: {
        actorUserId: "user-a",
        actorRole: "kasir",
        branch: "b_1",
      },
      run: runSpy,
    })

    const second = await runPosIdempotent({
      scope: "POS_SALES_POST",
      key: "pos-key-1",
      fingerprint: "fingerprint-a",
      namespace: {
        actorUserId: "user-a",
        actorRole: "kasir",
        branch: "b_1",
      },
      run: runSpy,
    })

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(runSpy).toHaveBeenCalledTimes(1)

    const payload = (await second.json()) as {
      saleId?: string
    }

    expect(payload.saleId).toBe("SALE-1")
  })

  it("returns conflict when same key is reused with different fingerprint in same namespace", async () => {
    const runSpy = vi.fn(async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      })
    )

    await runPosIdempotent({
      scope: "POS_SALES_POST",
      key: "pos-key-2",
      fingerprint: "fingerprint-a",
      namespace: {
        actorUserId: "user-a",
      },
      run: runSpy,
    })

    const conflict = await runPosIdempotent({
      scope: "POS_SALES_POST",
      key: "pos-key-2",
      fingerprint: "fingerprint-b",
      namespace: {
        actorUserId: "user-a",
      },
      run: runSpy,
    })

    expect(conflict.status).toBe(409)
    expect(runSpy).toHaveBeenCalledTimes(1)

    const payload = (await conflict.json()) as {
      error?: {
        code?: string
      }
    }

    expect(payload.error?.code).toBe("CONFLICT")
  })

  it("does not cache 5xx responses", async () => {
    const runSpy = vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: "INTERNAL" } }), {
        status: 500,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      })
    )

    await runPosIdempotent({
      scope: "POS_SALES_POST",
      key: "pos-key-3",
      fingerprint: "fingerprint-error",
      run: runSpy,
    })

    await runPosIdempotent({
      scope: "POS_SALES_POST",
      key: "pos-key-3",
      fingerprint: "fingerprint-error",
      run: runSpy,
    })

    expect(runSpy).toHaveBeenCalledTimes(2)
  })

  it("scopes idempotency by namespace context", async () => {
    const runSpy = vi.fn(async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      })
    )

    await runPosIdempotent({
      scope: "POS_SALES_POST",
      key: "shared-key",
      fingerprint: "fingerprint-a",
      namespace: {
        actorUserId: "user-a",
        branch: "b_1",
      },
      run: runSpy,
    })

    await runPosIdempotent({
      scope: "POS_SALES_POST",
      key: "shared-key",
      fingerprint: "fingerprint-a",
      namespace: {
        actorUserId: "user-b",
        branch: "b_1",
      },
      run: runSpy,
    })

    expect(runSpy).toHaveBeenCalledTimes(2)
  })

  it("evicts oldest stored entries when max size is reached", async () => {
    const previous = process.env.POS_IDEMPOTENCY_MAX_ENTRIES
    process.env.POS_IDEMPOTENCY_MAX_ENTRIES = "1"

    try {
      const runSpy = vi.fn(async () =>
        new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        })
      )

      await runPosIdempotent({
        scope: "POS_SALES_POST",
        key: "key-1",
        fingerprint: "fingerprint-1",
        namespace: { actorUserId: "user-1" },
        run: runSpy,
      })

      await runPosIdempotent({
        scope: "POS_SALES_POST",
        key: "key-2",
        fingerprint: "fingerprint-2",
        namespace: { actorUserId: "user-1" },
        run: runSpy,
      })

      await runPosIdempotent({
        scope: "POS_SALES_POST",
        key: "key-1",
        fingerprint: "fingerprint-1",
        namespace: { actorUserId: "user-1" },
        run: runSpy,
      })

      expect(runSpy).toHaveBeenCalledTimes(3)
    } finally {
      if (previous === undefined) {
        delete process.env.POS_IDEMPOTENCY_MAX_ENTRIES
      } else {
        process.env.POS_IDEMPOTENCY_MAX_ENTRIES = previous
      }
    }
  })

  it("rejects when pending idempotent queue is full", async () => {
    const previous = process.env.POS_IDEMPOTENCY_MAX_PENDING_ENTRIES
    process.env.POS_IDEMPOTENCY_MAX_PENDING_ENTRIES = "1"

    try {
      const deferred = createDeferred<Response>()
      const firstPromise = runPosIdempotent({
        scope: "POS_SALES_POST",
        key: "pending-key-1",
        fingerprint: "fingerprint-1",
        namespace: { actorUserId: "user-a" },
        run: () => deferred.promise,
      })

      const secondRun = vi.fn(async () =>
        new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        })
      )

      const second = await runPosIdempotent({
        scope: "POS_SALES_POST",
        key: "pending-key-2",
        fingerprint: "fingerprint-2",
        namespace: { actorUserId: "user-a" },
        run: secondRun,
      })

      expect(second.status).toBe(429)
      expect(secondRun).not.toHaveBeenCalled()

      deferred.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        })
      )

      const first = await firstPromise
      expect(first.status).toBe(201)
    } finally {
      if (previous === undefined) {
        delete process.env.POS_IDEMPOTENCY_MAX_PENDING_ENTRIES
      } else {
        process.env.POS_IDEMPOTENCY_MAX_PENDING_ENTRIES = previous
      }
    }
  })
})
