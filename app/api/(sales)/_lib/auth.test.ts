import { describe, expect, it } from "vitest"
import { ensureSalesBranchAccess } from "@/app/api/(sales)/_lib/auth"

type Role = "admin-penjualan" | "viewer"

function createAllowedGuard(input?: { role?: Role; branch?: string }) {
  const role = input?.role ?? "admin-penjualan"
  const branch = input?.branch ?? "cabang-a"

  return {
    ok: true as const,
    data: {
      user: {
        id: "user-1",
        name: "Tester",
        role,
        branch,
      },
      session: {
        provider: "jwt" as const,
        user: {
          id: "user-1",
          name: "Tester",
          role,
          branch,
        },
      },
    },
  }
}

describe("sales auth guards", () => {
  it("returns not found for unknown branch", async () => {
    const response = ensureSalesBranchAccess(createAllowedGuard({ role: "admin-penjualan" }), "unknown-branch")

    expect(response?.status).toBe(404)

    const payload = (await response?.json()) as {
      error?: {
        code?: string
      }
    }

    expect(payload.error?.code).toBe("NOT_FOUND")
  })

  it("allows viewer access to valid branch", () => {
    const response = ensureSalesBranchAccess(createAllowedGuard({ role: "viewer", branch: "cabang-a" }), "b_1")
    expect(response).toBeNull()
  })

  it("allows valid branch for admin role", () => {
    const response = ensureSalesBranchAccess(createAllowedGuard({ role: "admin-penjualan" }), "b_1")

    expect(response).toBeNull()
  })
})