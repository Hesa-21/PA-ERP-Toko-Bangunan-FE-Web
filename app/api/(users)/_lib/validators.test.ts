import { describe, expect, it } from "vitest"
import {
  parsePatchUserBody,
  parseUsersListRouteQuery,
  validateCreateUserRequired,
  validateNewPasswordRequired,
} from "@/app/api/(users)/_lib/validators"

describe("users validators", () => {
  it("marks limit above 200 as invalid", () => {
    const parsed = parseUsersListRouteQuery(new URL("https://example.com/api/users?limit=201"))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data.invalidLimitParam).toBe(true)
  })

  it("accepts valid limit within upper bound", () => {
    const parsed = parseUsersListRouteQuery(new URL("https://example.com/api/users?limit=200&page=1"))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data.invalidLimitParam).toBe(false)
    expect(parsed.data.limit).toBe(200)
  })

  it("rejects patch payload with empty trimmed name", () => {
    const parsed = parsePatchUserBody({ name: "   " })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return

    expect(parsed.error).toContain("Nama pengguna")
  })

  it("enforces stronger password policy for password update", () => {
    const weak = validateNewPasswordRequired("1234567890")
    expect(weak.ok).toBe(false)

    const strong = validateNewPasswordRequired("StrongPass123")
    expect(strong.ok).toBe(true)
  })

  it("rejects create user payload with weak password", () => {
    const result = validateCreateUserRequired({
      name: "Owner",
      email: "owner@example.com",
      password: "1234567890",
      role: "admin-penjualan",
      branch: undefined,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error).toContain("Minimal 10 karakter")
  })
})