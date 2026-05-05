import { afterEach, describe, expect, it, vi } from "vitest"
import { authenticateLogin } from "@/app/api/(auth)/_service/auth-login-service"
import { buildSession } from "@/lib/auth/session"
import { verifyAuthCredentials } from "@/lib/server/mock-db"

vi.mock("@/lib/auth/session", () => ({
  buildSession: vi.fn(),
}))

vi.mock("@/lib/server/mock-db", () => ({
  verifyAuthCredentials: vi.fn(),
}))

describe("authenticateLogin", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("throws INVALID_CREDENTIALS when credentials are invalid", () => {
    vi.mocked(verifyAuthCredentials).mockReturnValue(null)

    expect(() =>
      authenticateLogin({
        email: "owner@buildingstore.com",
        password: "wrong-password",
      })
    ).toThrowError("INVALID_CREDENTIALS")

    expect(buildSession).not.toHaveBeenCalled()
  })

  it("returns user and session when credentials are valid", () => {
    vi.mocked(verifyAuthCredentials).mockReturnValue({
      id: "u1",
      name: "Owner User",
      email: "owner@buildingstore.com",
      role: "super-admin",
      password: "hashed",
      active: true,
    } as never)

    const mockedSession = {
      user: {
        id: "u1",
        name: "Owner User",
        email: "owner@buildingstore.com",
        role: "super-admin",
      },
      defaultBranch: "",
      allowedBranches: [],
      permissions: {},
      modules: {},
    }
    vi.mocked(buildSession).mockReturnValue(mockedSession as never)

    const result = authenticateLogin({
      email: "owner@buildingstore.com",
      password: "ownerpass1",
    })

    expect(verifyAuthCredentials).toHaveBeenCalledWith({
      email: "owner@buildingstore.com",
      password: "ownerpass1",
    })
    expect(buildSession).toHaveBeenCalledWith({
      id: "u1",
      name: "Owner User",
      email: "owner@buildingstore.com",
      role: "super-admin",
      branch: undefined,
    })

    expect(result.user.id).toBe("u1")
    expect(result.session).toBe(mockedSession)
  })
})
