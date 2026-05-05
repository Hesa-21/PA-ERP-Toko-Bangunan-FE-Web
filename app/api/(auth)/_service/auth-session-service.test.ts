import { afterEach, describe, expect, it } from "vitest"
import { buildLogoutCookies, resolveSessionFromRequest } from "@/app/api/(auth)/_service/auth-session-service"
import { buildSession, serializeSessionCookie } from "@/lib/auth/session"
import { SELECTED_BRANCH_ID_KEY } from "@/lib/storage/keys"

const ORIGINAL_ENV = {
  NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER,
  JWT_ACCESS_COOKIE: process.env.JWT_ACCESS_COOKIE,
  JWT_ROLE_COOKIE: process.env.JWT_ROLE_COOKIE,
  JWT_BRANCH_COOKIE: process.env.JWT_BRANCH_COOKIE,
}

function restoreEnv() {
  const keys = [
    "NEXT_PUBLIC_AUTH_PROVIDER",
    "JWT_ACCESS_COOKIE",
    "JWT_ROLE_COOKIE",
    "JWT_BRANCH_COOKIE",
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

describe("auth session service", () => {
  it("resolves mock session from cookie header", () => {
    delete process.env.NEXT_PUBLIC_AUTH_PROVIDER

    const session = buildSession({
      id: "u1",
      name: "Owner User",
      email: "owner@buildingstore.com",
      role: "admin-penjualan",
    })

    const cookieHeader = serializeSessionCookie(session)
    const resolved = resolveSessionFromRequest({ cookieHeader })

    expect(resolved.user?.id).toBe("u1")
    expect((resolved.session as { user?: { id?: string } } | null)?.user?.id).toBe("u1")
  })

  it("builds logout cookies for mock provider", () => {
    delete process.env.NEXT_PUBLIC_AUTH_PROVIDER

    const cookies = buildLogoutCookies()

    expect(cookies.some((cookie) => cookie.startsWith("mock_session="))).toBe(true)
    expect(cookies.some((cookie) => cookie.startsWith(`${SELECTED_BRANCH_ID_KEY}=`))).toBe(true)
  })

  it("builds logout cookies for jwt provider", () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "jwt"
    process.env.JWT_ACCESS_COOKIE = "jwt_access"
    process.env.JWT_ROLE_COOKIE = "jwt_role"
    process.env.JWT_BRANCH_COOKIE = "jwt_branch"

    const cookies = buildLogoutCookies()

    expect(cookies.some((cookie) => cookie.startsWith("jwt_access="))).toBe(true)
    expect(cookies.some((cookie) => cookie.startsWith("jwt_role="))).toBe(true)
    expect(cookies.some((cookie) => cookie.startsWith("jwt_branch="))).toBe(true)
  })

  it("returns null session when jwt token is missing", () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "jwt"

    const resolved = resolveSessionFromRequest({ cookieHeader: null })

    expect(resolved.user).toBeNull()
    expect(resolved.session).toBeNull()
  })
})
