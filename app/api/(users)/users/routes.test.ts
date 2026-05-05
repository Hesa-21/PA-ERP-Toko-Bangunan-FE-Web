import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as usersController from "@/app/api/(users)/_controller/users-controller"
import * as usersPasswordController from "@/app/api/(users)/_controller/users-password-controller"
import * as usersRoute from "@/app/api/(users)/users/route"
import * as userDetailRoute from "@/app/api/(users)/users/[id]/route"
import * as userPasswordRoute from "@/app/api/(users)/users/[id]/password/route"

vi.mock("@/app/api/(users)/_controller/users-controller", () => ({
  handleUsersGet: vi.fn(),
  handleUsersPost: vi.fn(),
  handleUserPatch: vi.fn(),
  handleUserDelete: vi.fn(),
}))

vi.mock("@/app/api/(users)/_controller/users-password-controller", () => ({
  handleUserPasswordPatch: vi.fn(),
}))

describe("users route delegation", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("delegates list GET and POST to users controller", async () => {
    vi.mocked(usersController.handleUsersGet).mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }))
    vi.mocked(usersController.handleUsersPost).mockResolvedValue(NextResponse.json({ ok: true }, { status: 201 }))

    const getRequest = new Request("https://example.com/api/users")
    const postRequest = new Request("https://example.com/api/users", { method: "POST" })

    await usersRoute.GET(getRequest)
    await usersRoute.POST(postRequest)

    expect(usersController.handleUsersGet).toHaveBeenCalledWith(getRequest)
    expect(usersController.handleUsersPost).toHaveBeenCalledWith(postRequest)
  })

  it("delegates detail PATCH and DELETE to users controller", async () => {
    vi.mocked(usersController.handleUserPatch).mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }))
    vi.mocked(usersController.handleUserDelete).mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }))

    const request = new Request("https://example.com/api/users/u-1")
    const ctx = { params: Promise.resolve({ id: "u-1" }) }

    await userDetailRoute.PATCH(request, ctx)
    await userDetailRoute.DELETE(request, ctx)

    expect(usersController.handleUserPatch).toHaveBeenCalledWith(request, ctx)
    expect(usersController.handleUserDelete).toHaveBeenCalledWith(request, ctx)
  })

  it("delegates password PATCH to password controller", async () => {
    vi.mocked(usersPasswordController.handleUserPasswordPatch).mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    )

    const request = new Request("https://example.com/api/users/u-1/password", { method: "PATCH" })
    const ctx = { params: Promise.resolve({ id: "u-1" }) }

    await userPasswordRoute.PATCH(request as never, ctx)

    expect(usersPasswordController.handleUserPasswordPatch).toHaveBeenCalledWith(request, ctx)
  })
})
