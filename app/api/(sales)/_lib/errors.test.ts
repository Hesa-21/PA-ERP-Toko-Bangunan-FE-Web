import { describe, expect, it } from "vitest"
import { mapSalesRouteError } from "@/app/api/(sales)/_lib/errors"

describe("sales error mapping", () => {
  it("maps BRANCH_NOT_FOUND into NOT_FOUND", async () => {
    const response = mapSalesRouteError(new Error("BRANCH_NOT_FOUND"), "fallback")
    expect(response.status).toBe(404)

    const payload = (await response.json()) as {
      error: {
        code: string
        message: string
      }
    }

    expect(payload.error.code).toBe("NOT_FOUND")
    expect(payload.error.message).toContain("Branch")
  })

  it("maps VOID_FORBIDDEN_FOR_ROLE into FORBIDDEN", async () => {
    const response = mapSalesRouteError(new Error("VOID_FORBIDDEN_FOR_ROLE"), "fallback")
    expect(response.status).toBe(403)

    const payload = (await response.json()) as {
      error: {
        code: string
        message: string
      }
    }

    expect(payload.error.code).toBe("FORBIDDEN")
    expect(payload.error.message).toContain("Super Admin")
  })

  it("uses fallback for unknown errors", async () => {
    const response = mapSalesRouteError(new Error("UNKNOWN_ERROR"), "Failed to load sales")
    expect(response.status).toBe(500)

    const payload = (await response.json()) as {
      error: {
        code: string
        message: string
      }
    }

    expect(payload.error.code).toBe("INTERNAL")
    expect(payload.error.message).toBe("Failed to load sales")
  })
})