import { afterEach, describe, expect, it, vi } from "vitest"
import { type NextRequest } from "next/server"
import * as usersAuth from "@/app/api/(users)/_lib/auth"
import * as usersService from "@/app/api/(users)/_service/users-service"
import { handleUserPasswordPatch } from "@/app/api/(users)/_controller/users-password-controller"

function createAllowedGuard() {
  return {
    ok: true as const,
    data: {
      user: {
        id: "user-1",
        name: "Owner",
        role: "super-admin",
        branch: "cabang-a",
      },
      session: {
        provider: "jwt" as const,
        user: {
          id: "user-1",
          name: "Owner",
          role: "super-admin",
          branch: "cabang-a",
        },
      },
    },
  }
}

describe("users password controller", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects malformed JSON payload before password service call", async () => {
    vi.spyOn(usersAuth, "requireUsersUpdateGuard").mockReturnValue(createAllowedGuard() as never)
    const changeSpy = vi.spyOn(usersService, "changeUserPassword")

    const response = await handleUserPasswordPatch(
      new Request("https://example.com/api/users/u-1/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }) as NextRequest,
      { params: Promise.resolve({ id: "u-1" }) }
    )

    expect(response.status).toBe(400)
    expect(changeSpy).not.toHaveBeenCalled()

    const payload = (await response.json()) as {
      error?: {
        code?: string
        message?: string
      }
    }

    expect(payload.error?.code).toBe("BAD_REQUEST")
    expect(payload.error?.message).toContain("JSON")
  })

  it("updates password for valid payload", async () => {
    vi.spyOn(usersAuth, "requireUsersUpdateGuard").mockReturnValue(createAllowedGuard() as never)
    const changeSpy = vi.spyOn(usersService, "changeUserPassword").mockReturnValue(true)

    const response = await handleUserPasswordPatch(
      new Request("https://example.com/api/users/u-1/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "StrongPass123" }),
      }) as NextRequest,
      { params: Promise.resolve({ id: "u-1" }) }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(changeSpy).toHaveBeenCalledWith("u-1", "StrongPass123", undefined)
  })
})
