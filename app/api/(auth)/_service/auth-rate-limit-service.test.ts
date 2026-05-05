import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearLoginThrottle,
  readLoginThrottle,
  registerLoginFailure,
  resetLoginThrottleStoreForTests,
} from "@/app/api/(auth)/_service/auth-rate-limit-service"

const ORIGINAL_ENV = {
  AUTH_LOGIN_THROTTLE_MAX_ENTRIES: process.env.AUTH_LOGIN_THROTTLE_MAX_ENTRIES,
  AUTH_LOGIN_THROTTLE_GC_AGE_MS: process.env.AUTH_LOGIN_THROTTLE_GC_AGE_MS,
  AUTH_LOGIN_THROTTLE_GC_INTERVAL_MS: process.env.AUTH_LOGIN_THROTTLE_GC_INTERVAL_MS,
}

type AuthRateLimitGlobals = typeof globalThis & {
  __erpAuthLoginThrottleStore?: Map<string, unknown>
}

function makeInput(email: string, clientIp: string) {
  return { email, clientIp }
}

function restoreAuthRateLimitEnv() {
  const keys = [
    "AUTH_LOGIN_THROTTLE_MAX_ENTRIES",
    "AUTH_LOGIN_THROTTLE_GC_AGE_MS",
    "AUTH_LOGIN_THROTTLE_GC_INTERVAL_MS",
  ] as const

  for (const key of keys) {
    const value = ORIGINAL_ENV[key]
    if (typeof value === "string") {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }
}

describe("auth login throttle", () => {
  beforeEach(() => {
    resetLoginThrottleStoreForTests()
  })

  afterEach(() => {
    resetLoginThrottleStoreForTests()
    vi.restoreAllMocks()
    restoreAuthRateLimitEnv()
  })

  it("blocks pair scope after repeated failures", () => {
    const input = makeInput("owner@buildingstore.com", "203.0.113.10")

    for (let i = 0; i < 4; i += 1) {
      const result = registerLoginFailure(input)
      expect(result.blocked).toBe(false)
    }

    const blocked = registerLoginFailure(input)
    expect(blocked.blocked).toBe(true)
    expect(blocked.scope).toBe("pair")

    const preCheck = readLoginThrottle(input)
    expect(preCheck.blocked).toBe(true)
    expect(preCheck.scope).toBe("pair")
  })

  it("blocks email scope across rotating IP addresses", () => {
    const email = "owner@buildingstore.com"

    for (let i = 0; i < 11; i += 1) {
      const result = registerLoginFailure(makeInput(email, `203.0.113.${i + 1}`))
      expect(result.blocked).toBe(false)
    }

    const blocked = registerLoginFailure(makeInput(email, "203.0.113.99"))
    expect(blocked.blocked).toBe(true)
    expect(blocked.scope).toBe("email")
  })

  it("blocks IP scope across many target emails", () => {
    const clientIp = "203.0.113.25"

    for (let i = 0; i < 29; i += 1) {
      const result = registerLoginFailure(makeInput(`user-${i}@example.com`, clientIp))
      expect(result.blocked).toBe(false)
    }

    const blocked = registerLoginFailure(makeInput("user-30@example.com", clientIp))
    expect(blocked.blocked).toBe(true)
    expect(blocked.scope).toBe("ip")
  })

  it("clears pair and email scopes after successful login", () => {
    const input = makeInput("owner@buildingstore.com", "203.0.113.10")

    for (let i = 0; i < 5; i += 1) {
      registerLoginFailure(input)
    }

    expect(readLoginThrottle(input).blocked).toBe(true)

    clearLoginThrottle(input)

    expect(readLoginThrottle(input).blocked).toBe(false)
  })

  it("expires block after cooldown window", () => {
    const input = makeInput("owner@buildingstore.com", "203.0.113.10")
    let currentNow = 1_700_000_000_000
    vi.spyOn(Date, "now").mockImplementation(() => currentNow)

    for (let i = 0; i < 5; i += 1) {
      registerLoginFailure(input)
    }

    expect(readLoginThrottle(input).blocked).toBe(true)

    currentNow += 5 * 60 * 1000 + 1

    expect(readLoginThrottle(input).blocked).toBe(false)
  })

  it("keeps in-memory throttle store bounded when max entries is configured", () => {
    process.env.AUTH_LOGIN_THROTTLE_MAX_ENTRIES = "2"

    registerLoginFailure(makeInput("user-a@example.com", "192.0.2.1"))
    registerLoginFailure(makeInput("user-b@example.com", "192.0.2.2"))
    registerLoginFailure(makeInput("user-c@example.com", "192.0.2.3"))

    const store = (globalThis as AuthRateLimitGlobals).__erpAuthLoginThrottleStore
    expect(store?.size).toBeLessThanOrEqual(2)
  })

  it("garbage-collects stale entries using configured GC window", () => {
    process.env.AUTH_LOGIN_THROTTLE_GC_AGE_MS = "60000"
    process.env.AUTH_LOGIN_THROTTLE_GC_INTERVAL_MS = "1000"

    let currentNow = 1_800_000_000_000
    vi.spyOn(Date, "now").mockImplementation(() => currentNow)

    registerLoginFailure(makeInput("stale@example.com", "198.51.100.10"))

    currentNow += 61_000
    readLoginThrottle(makeInput("fresh@example.com", "198.51.100.11"))

    const store = (globalThis as AuthRateLimitGlobals).__erpAuthLoginThrottleStore
    expect(store?.size ?? 0).toBe(0)
  })
})