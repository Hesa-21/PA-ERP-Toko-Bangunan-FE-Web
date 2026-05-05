import { afterEach, beforeEach, describe, expect, it } from "vitest"
import * as loginRoute from "@/app/api/(auth)/auth/login/route"
import * as logoutRoute from "@/app/api/(auth)/auth/logout/route"
import * as meRoute from "@/app/api/(auth)/auth/me/route"
import { resetLoginThrottleStoreForTests } from "@/app/api/(auth)/_service/auth-rate-limit-service"

const ADMIN_KASIR_EMAIL = "kasir@cabang-a.com"
const ADMIN_KASIR_PASSWORD = "kasirpass1"

function readCookiePair(setCookieHeader: string | null): string {
  if (!setCookieHeader) return ""
  return setCookieHeader.split(";")[0] ?? ""
}

describe("auth flow routes", () => {
  beforeEach(() => {
    resetLoginThrottleStoreForTests()
  })

  afterEach(() => {
    resetLoginThrottleStoreForTests()
  })

  it("completes login -> me -> logout flow", async () => {
    const loginResponse = await loginRoute.POST(
      new Request("https://example.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ADMIN_KASIR_EMAIL, password: ADMIN_KASIR_PASSWORD }),
      })
    )

    expect(loginResponse.status).toBe(200)
    expect(loginResponse.headers.get("cache-control")).toBe("no-store")

    const loginPayload = (await loginResponse.json()) as {
      ok?: boolean
      user?: { id?: string }
      session?: { user?: { id?: string } }
    }

    expect(loginPayload.ok).toBe(true)
    expect(loginPayload.user?.id).toBeTruthy()
    expect(loginPayload.session?.user?.id).toBe(loginPayload.user?.id)

    const cookieHeader = readCookiePair(loginResponse.headers.get("set-cookie"))
    expect(cookieHeader).toContain("mock_session=")

    const meResponse = await meRoute.GET(
      new Request("https://example.com/api/auth/me", {
        headers: {
          cookie: cookieHeader,
        },
      })
    )

    expect(meResponse.status).toBe(200)
    expect(meResponse.headers.get("cache-control")).toBe("no-store")

    const mePayload = (await meResponse.json()) as {
      user?: { id?: string } | null
      session?: { user?: { id?: string } } | null
    }

    expect(mePayload.user?.id).toBe(loginPayload.user?.id)
    expect(mePayload.session?.user?.id).toBe(loginPayload.user?.id)

    const logoutResponse = await logoutRoute.POST()
    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.headers.get("cache-control")).toBe("no-store")

    const logoutCookie = logoutResponse.headers.get("set-cookie")
    expect(logoutCookie).toContain("mock_session=;")
    expect(logoutCookie).toContain("Max-Age=0")
  })

  it("rejects malformed JSON payload on login", async () => {
    const response = await loginRoute.POST(
      new Request("https://example.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    )

    expect(response.status).toBe(400)

    const payload = (await response.json()) as {
      error?: {
        code?: string
        message?: string
      }
    }

    expect(payload.error?.code).toBe("BAD_REQUEST")
    expect(payload.error?.message).toContain("JSON")
  })

  it("rejects invalid credentials", async () => {
    const response = await loginRoute.POST(
      new Request("https://example.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ADMIN_KASIR_EMAIL, password: "wrong-password" }),
      })
    )

    expect(response.status).toBe(401)

    const payload = (await response.json()) as {
      error?: {
        code?: string
      }
    }

    expect(payload.error?.code).toBe("UNAUTHORIZED")
  })
})
