import { describe, expect, it } from "vitest"
import { mapUsersRouteError } from "@/app/api/(users)/_lib/errors"

describe("users error mapping", () => {
  it("maps BRANCH_NOT_FOUND into BAD_REQUEST response", async () => {
    const response = mapUsersRouteError(new Error("BRANCH_NOT_FOUND"), "fallback")
    expect(response.status).toBe(400)

    const payload = (await response.json()) as {
      error: {
        code: string
        message: string
      }
    }

    expect(payload.error.code).toBe("BAD_REQUEST")
    expect(payload.error.message).toContain("Cabang")
  })

  it("uses fallback message for unknown errors", async () => {
    const response = mapUsersRouteError(new Error("UNKNOWN_FAILURE"), "Failed to update user")
    expect(response.status).toBe(500)

    const payload = (await response.json()) as {
      error: {
        code: string
        message: string
      }
    }

    expect(payload.error.code).toBe("INTERNAL")
    expect(payload.error.message).toBe("Failed to update user")
  })
})