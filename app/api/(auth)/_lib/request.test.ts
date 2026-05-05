import { afterEach, describe, expect, it } from "vitest"
import { resolveClientIp } from "@/app/api/(auth)/_lib/request"

const ORIGINAL_ENV = {
  AUTH_TRUST_PROXY_HEADERS: process.env.AUTH_TRUST_PROXY_HEADERS,
  AUTH_TRUSTED_PROXY_CIDRS: process.env.AUTH_TRUSTED_PROXY_CIDRS,
  TRUST_PROXY_HEADERS: process.env.TRUST_PROXY_HEADERS,
  TRUSTED_PROXY_CIDRS: process.env.TRUSTED_PROXY_CIDRS,
}

function restoreEnv() {
  const keys = [
    "AUTH_TRUST_PROXY_HEADERS",
    "AUTH_TRUSTED_PROXY_CIDRS",
    "TRUST_PROXY_HEADERS",
    "TRUSTED_PROXY_CIDRS",
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

afterEach(() => {
  restoreEnv()
})

describe("resolveClientIp", () => {
  it("uses trusted proxy chain rules when configured", () => {
    process.env.AUTH_TRUST_PROXY_HEADERS = "true"
    process.env.AUTH_TRUSTED_PROXY_CIDRS = "10.0.0.0/8, 198.51.100.0/24"

    const request = new Request("https://example.com/api/auth/login", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.42, 198.51.100.20, 10.0.0.7",
      },
    })

    expect(resolveClientIp(request)).toBe("203.0.113.42")
  })

  it("prefers direct IP headers when trust proxy is disabled", () => {
    process.env.AUTH_TRUST_PROXY_HEADERS = "false"

    const request = new Request("https://example.com/api/auth/login", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.42",
        "x-real-ip": "198.51.100.88",
      },
    })

    expect(resolveClientIp(request)).toBe("198.51.100.88")
  })

  it("falls back to unknown for missing or invalid headers", () => {
    process.env.AUTH_TRUST_PROXY_HEADERS = "true"

    const request = new Request("https://example.com/api/auth/login", {
      method: "POST",
      headers: {
        "x-forwarded-for": "garbage-ip-value",
      },
    })

    expect(resolveClientIp(request)).toBe("unknown")
  })
})