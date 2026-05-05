import { afterEach, describe, expect, it, vi } from "vitest"
import { logAuthLoginAudit } from "@/app/api/(auth)/_service/auth-audit-log-service"

const ORIGINAL_ENV = {
  AUTH_AUDIT_LOG: process.env.AUTH_AUDIT_LOG,
  NODE_ENV: process.env.NODE_ENV,
}

const envRecord = process.env as Record<string, string | undefined>

function restoreEnv() {
  const keys = ["AUTH_AUDIT_LOG", "NODE_ENV"] as const

  for (const key of keys) {
    const value = ORIGINAL_ENV[key]
    if (typeof value === "string") {
      envRecord[key] = value
    } else {
      delete envRecord[key]
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  restoreEnv()
})

describe("auth audit log service", () => {
  it("logs success to console.info when explicitly enabled", () => {
    envRecord.AUTH_AUDIT_LOG = "true"
    envRecord.NODE_ENV = "test"

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    logAuthLoginAudit({
      status: "SUCCESS",
      reason: "LOGIN_SUCCESS",
      email: "owner@buildingstore.com",
      clientIp: "203.0.113.10",
    })

    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()

    const call = infoSpy.mock.calls[0] as [string]
    expect(call[0]).toContain("[auth-audit]")

    const payload = JSON.parse(call[0].replace("[auth-audit] ", "")) as {
      domain?: string
      event?: string
      status?: string
      reason?: string
      emailHash?: string
      ipHash?: string
    }

    expect(payload.domain).toBe("auth")
    expect(payload.event).toBe("AUTH_LOGIN")
    expect(payload.status).toBe("SUCCESS")
    expect(payload.reason).toBe("LOGIN_SUCCESS")
    expect(payload.emailHash).toHaveLength(16)
    expect(payload.ipHash).toHaveLength(16)
  })

  it("defaults to enabled in production and sends failures to console.warn", () => {
    delete envRecord.AUTH_AUDIT_LOG
    envRecord.NODE_ENV = "production"

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    logAuthLoginAudit({
      status: "FAILED",
      reason: "INVALID_CREDENTIALS",
      email: "owner@buildingstore.com",
      clientIp: "203.0.113.10",
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it("allows explicit disable even in production", () => {
    envRecord.AUTH_AUDIT_LOG = "0"
    envRecord.NODE_ENV = "production"

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    logAuthLoginAudit({
      status: "THROTTLED",
      reason: "PRECHECK_pair",
      retryAfterSec: 60,
      clientIp: "203.0.113.10",
    })

    expect(infoSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
