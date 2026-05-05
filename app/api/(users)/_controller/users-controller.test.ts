import { afterEach, describe, expect, it, vi } from "vitest"
import * as usersAuth from "@/app/api/(users)/_lib/auth"
import * as usersService from "@/app/api/(users)/_service/users-service"
import { handleUserDelete, handleUserPatch, handleUsersGet, handleUsersPost } from "@/app/api/(users)/_controller/users-controller"

function createAllowedGuard(userId = "user-1") {
  return {
    ok: true as const,
    data: {
      user: {
        id: userId,
        name: "Owner",
        role: "admin-penjualan",
        branch: "cabang-a",
      },
      session: {
        provider: "jwt" as const,
        user: {
          id: userId,
          name: "Owner",
          role: "admin-penjualan",
          branch: "cabang-a",
        },
      },
    },
  }
}

describe("users controller", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects invalid list limit before service layer", async () => {
    vi.spyOn(usersAuth, "requireUsersReadGuard").mockReturnValue(createAllowedGuard() as never)
    const listSpy = vi.spyOn(usersService, "listUsersFromQuery")

    const response = await handleUsersGet(new Request("https://example.com/api/users?limit=201"))

    expect(response.status).toBe(400)
    expect(listSpy).not.toHaveBeenCalled()

    const payload = (await response.json()) as {
      error?: {
        message?: string
      }
    }

    expect(payload.error?.message).toContain("limit")
  })

  it("returns users payload for valid list query", async () => {
    vi.spyOn(usersAuth, "requireUsersReadGuard").mockReturnValue(createAllowedGuard() as never)
    const listSpy = vi.spyOn(usersService, "listUsersFromQuery").mockReturnValue({
      users: [
        {
          id: "u-1",
          name: "Owner",
          email: "owner@example.com",
          role: "admin-penjualan",
          active: true,
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 100,
        q: "",
        role: "all",
        status: "all",
      },
    })

    const response = await handleUsersGet(new Request("https://example.com/api/users?q=owner&page=1&limit=100"))

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "owner",
        page: 1,
        limit: 100,
      }),
      undefined
    )
  })

  it("rejects malformed JSON payload for create user", async () => {
    vi.spyOn(usersAuth, "requireUsersCreateGuard").mockReturnValue(createAllowedGuard() as never)
    const createSpy = vi.spyOn(usersService, "createUserRecord")

    const response = await handleUsersPost(
      new Request("https://example.com/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    )

    expect(response.status).toBe(400)
    expect(createSpy).not.toHaveBeenCalled()

    const payload = (await response.json()) as {
      error?: {
        code?: string
        message?: string
      }
    }

    expect(payload.error?.code).toBe("BAD_REQUEST")
    expect(payload.error?.message).toContain("JSON")
  })

  it("rejects malformed JSON payload for patch user", async () => {
    vi.spyOn(usersAuth, "requireUsersUpdateGuard").mockReturnValue(createAllowedGuard() as never)
    const patchSpy = vi.spyOn(usersService, "patchUserRecord")

    const response = await handleUserPatch(
      new Request("https://example.com/api/users/u-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      { params: Promise.resolve({ id: "u-1" }) }
    )

    expect(response.status).toBe(400)
    expect(patchSpy).not.toHaveBeenCalled()

    const payload = (await response.json()) as {
      error?: {
        code?: string
        message?: string
      }
    }

    expect(payload.error?.code).toBe("BAD_REQUEST")
    expect(payload.error?.message).toContain("JSON")
  })

  it("prevents deleting own account", async () => {
    vi.spyOn(usersAuth, "requireUsersDeleteGuard").mockReturnValue(createAllowedGuard("u-1") as never)
    const deleteSpy = vi.spyOn(usersService, "removeUserRecord")

    const response = await handleUserDelete(new Request("https://example.com/api/users/u-1"), {
      params: Promise.resolve({ id: "u-1" }),
    })

    expect(response.status).toBe(400)
    expect(deleteSpy).not.toHaveBeenCalled()

    const payload = (await response.json()) as {
      error?: {
        code?: string
        message?: string
      }
    }

    expect(payload.error?.code).toBe("BAD_REQUEST")
    expect(payload.error?.message).toContain("own account")
  })
})
