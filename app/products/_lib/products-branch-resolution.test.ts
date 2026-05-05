import { afterEach, describe, expect, it } from "vitest"
import { createHmac } from "node:crypto"
import { buildSession, resolveBranchFromAuthCookies, serializeSessionCookie } from "@/lib/auth/session"
import { SELECTED_BRANCH_ID_KEY } from "@/lib/storage/keys"

type EnvSnapshot = {
  NEXT_PUBLIC_AUTH_PROVIDER: string | undefined
  JWT_ACCESS_COOKIE: string | undefined
  JWT_ROLE_COOKIE: string | undefined
  JWT_BRANCH_COOKIE: string | undefined
  JWT_SECRET: string | undefined
}

const ORIGINAL_ENV: EnvSnapshot = {
  NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER,
  JWT_ACCESS_COOKIE: process.env.JWT_ACCESS_COOKIE,
  JWT_ROLE_COOKIE: process.env.JWT_ROLE_COOKIE,
  JWT_BRANCH_COOKIE: process.env.JWT_BRANCH_COOKIE,
  JWT_SECRET: process.env.JWT_SECRET,
}

function signHs256Token(payload: Record<string, unknown>, secret: string): string {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8").toString("base64url")
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac("sha256", secret).update(signingInput).digest("base64url")
  return `${signingInput}.${signature}`
}

function restoreEnv() {
  const keys = [
    "NEXT_PUBLIC_AUTH_PROVIDER",
    "JWT_ACCESS_COOKIE",
    "JWT_ROLE_COOKIE",
    "JWT_BRANCH_COOKIE",
    "JWT_SECRET",
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

describe("resolveBranchFromAuthCookies", () => {
  it("resolves central branch from mock session cookies", () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "mock"

    const session = buildSession({
      id: "u-1",
      name: "Admin Penjualan",
      email: "gudang@example.com",
      role: "admin-penjualan",
      branch: "cabang-b",
    })

    const mockCookie = serializeSessionCookie(session).split(";")[0]
    const cookieHeader = `${mockCookie}; ${SELECTED_BRANCH_ID_KEY}=b_2`

    const resolved = resolveBranchFromAuthCookies(cookieHeader)
    expect(resolved?.id).toBe("b_1")
  })

  it("resolves central branch from jwt role and branch cookie", () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "jwt"
    process.env.JWT_SECRET = "test-jwt-secret"

    const token = signHs256Token(
      {
        sub: "u-jwt-1",
        role: "admin-penjualan",
        branch: "cabang-b",
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      process.env.JWT_SECRET
    )

    const cookieHeader = `access_token=${token}`
    const resolved = resolveBranchFromAuthCookies(cookieHeader)

    expect(resolved?.id).toBe("b_1")
  })

  it("falls back to central branch for jwt admin-penjualan", () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "jwt"
    process.env.JWT_SECRET = "test-jwt-secret"

    const token = signHs256Token(
      {
        sub: "u-jwt-2",
        role: "admin-penjualan",
        branch: "cabang-b",
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      process.env.JWT_SECRET
    )

    const cookieHeader = `access_token=${token}; ${SELECTED_BRANCH_ID_KEY}=b_3`
    const resolved = resolveBranchFromAuthCookies(cookieHeader)

    expect(resolved?.id).toBe("b_1")
  })

  it("returns undefined for mock viewer when no valid branch is available", () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "mock"

    const session = buildSession({
      id: "u-2",
      name: "Sales Viewer",
      email: "kasir@example.com",
      role: "viewer",
    })

    const mockCookie = serializeSessionCookie(session).split(";")[0]
    const resolved = resolveBranchFromAuthCookies(mockCookie)

    expect(resolved).toBeUndefined()
  })

  it("falls back to default branch for mock admin-penjualan", () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "mock"

    const session = buildSession({
      id: "u-3",
      name: "Admin Penjualan",
      email: "super-admin@example.com",
      role: "admin-penjualan",
    })

    const mockCookie = serializeSessionCookie(session).split(";")[0]
    const resolved = resolveBranchFromAuthCookies(mockCookie)

    expect(resolved?.id).toBe(session.defaultBranchId)
  })
})
