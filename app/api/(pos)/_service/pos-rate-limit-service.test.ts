import { beforeEach, describe, expect, it, vi } from "vitest"
import { consumePosSalesRateLimit } from "@/app/api/(pos)/_service/pos-rate-limit-service"

type PosRateLimitGlobals = typeof globalThis & {
  __erpPosRateLimitStore?: Map<string, unknown>
}

function resetPosRateLimitStore() {
  const scope = globalThis as PosRateLimitGlobals
  scope.__erpPosRateLimitStore = new Map<string, unknown>()
}

describe("pos rate-limit service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"))
    resetPosRateLimitStore()
  })

  it("blocks when sales scope exceeds its limit", () => {
    for (let index = 0; index < 45; index += 1) {
      const result = consumePosSalesRateLimit({
        scope: "POS_SALES_POST",
        clientIp: "10.10.10.1",
      })
      expect(result.ok).toBe(true)
    }

    const blocked = consumePosSalesRateLimit({
      scope: "POS_SALES_POST",
      clientIp: "10.10.10.1",
    })

    expect(blocked.ok).toBe(false)
    if (blocked.ok) return

    expect(blocked.retryAfterSec).toBeGreaterThan(0)
  })

  it("resets quota after one window duration", () => {
    for (let index = 0; index < 45; index += 1) {
      consumePosSalesRateLimit({
        scope: "POS_SALES_POST",
        clientIp: "10.10.10.2",
      })
    }

    const blocked = consumePosSalesRateLimit({
      scope: "POS_SALES_POST",
      clientIp: "10.10.10.2",
    })

    expect(blocked.ok).toBe(false)

    vi.advanceTimersByTime(60_000)

    const allowedAgain = consumePosSalesRateLimit({
      scope: "POS_SALES_POST",
      clientIp: "10.10.10.2",
    })

    expect(allowedAgain.ok).toBe(true)
  })

  it("normalizes forwarded-for chain to first client ip", () => {
    for (let index = 0; index < 45; index += 1) {
      consumePosSalesRateLimit({
        scope: "POS_SALES_POST",
        clientIp: "203.0.113.10",
      })
    }

    const blocked = consumePosSalesRateLimit({
      scope: "POS_SALES_POST",
      clientIp: "203.0.113.10, 198.51.100.99",
    })

    expect(blocked.ok).toBe(false)
  })

  it("applies quota independently per actor namespace", () => {
    for (let index = 0; index < 45; index += 1) {
      const result = consumePosSalesRateLimit({
        scope: "POS_SALES_POST",
        clientIp: "10.10.10.3",
        actorUserId: "user-a",
      })
      expect(result.ok).toBe(true)
    }

    const blocked = consumePosSalesRateLimit({
      scope: "POS_SALES_POST",
      clientIp: "10.10.10.3",
      actorUserId: "user-a",
    })
    expect(blocked.ok).toBe(false)

    const allowedOtherActor = consumePosSalesRateLimit({
      scope: "POS_SALES_POST",
      clientIp: "10.10.10.3",
      actorUserId: "user-b",
    })
    expect(allowedOtherActor.ok).toBe(true)
  })

  it("keeps in-memory store bounded when max entries is configured", () => {
    const previous = process.env.POS_RATE_LIMIT_MAX_ENTRIES
    process.env.POS_RATE_LIMIT_MAX_ENTRIES = "2"

    try {
      consumePosSalesRateLimit({
        scope: "POS_SALES_POST",
        clientIp: "192.0.2.1",
        actorUserId: "user-1",
      })
      consumePosSalesRateLimit({
        scope: "POS_SALES_POST",
        clientIp: "192.0.2.2",
        actorUserId: "user-2",
      })
      consumePosSalesRateLimit({
        scope: "POS_SALES_POST",
        clientIp: "192.0.2.3",
        actorUserId: "user-3",
      })

      const store = (globalThis as PosRateLimitGlobals).__erpPosRateLimitStore
      expect(store?.size).toBeLessThanOrEqual(2)
    } finally {
      if (previous === undefined) {
        delete process.env.POS_RATE_LIMIT_MAX_ENTRIES
      } else {
        process.env.POS_RATE_LIMIT_MAX_ENTRIES = previous
      }
    }
  })
})
