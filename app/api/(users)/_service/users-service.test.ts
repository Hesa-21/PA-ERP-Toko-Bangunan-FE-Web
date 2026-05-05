import { describe, expect, it, vi } from "vitest"
import {
  changeUserPassword,
  createUserRecord,
  listUsersFromQuery,
  patchUserRecord,
  removeUserRecord,
} from "@/app/api/(users)/_service/users-service"
import type { UsersRepository } from "@/app/api/(users)/_service/users-repository"
import type { UsersListRouteQuery } from "@/app/api/(users)/_lib/validators"
import type { User, UsersListResponse } from "@/lib/domain/users"

function createRepositorySpy() {
  const listResponse: UsersListResponse = {
    users: [],
    meta: {
      total: 0,
      page: 1,
      limit: 100,
      q: "",
      role: "all",
      status: "all",
    },
  }

  const user: User = {
    id: "u-1",
    name: "Owner",
    email: "owner@example.com",
    role: "admin-penjualan",
    active: true,
  }

  const listUsers = vi.fn<(query: UsersListRouteQuery) => UsersListResponse>(() => listResponse)
  const createUser = vi.fn<(input: Parameters<UsersRepository["createUser"]>[0]) => User>(() => user)
  const patchUser = vi.fn<(id: string, patch: Parameters<UsersRepository["patchUser"]>[1]) => User | null>(() => user)
  const removeUser = vi.fn<(id: string) => boolean>(() => true)
  const changePassword = vi.fn<(id: string, newPassword: string) => boolean>(() => true)

  const repository: UsersRepository = {
    listUsers,
    createUser,
    patchUser,
    removeUser,
    changePassword,
  }

  return {
    repository,
    listUsers,
    createUser,
    patchUser,
    removeUser,
    changePassword,
  }
}

describe("users service layering", () => {
  it("delegates list users query to repository", () => {
    const deps = createRepositorySpy()
    const query: UsersListRouteQuery = {
      q: "owner",
      role: "all",
      status: "all",
      page: 1,
      limit: 50,
      invalidPageParam: false,
      invalidLimitParam: false,
    }

    const result = listUsersFromQuery(query, { repository: deps.repository })
    expect(deps.listUsers).toHaveBeenCalledTimes(1)
    expect(deps.listUsers).toHaveBeenCalledWith(query)
    expect(result.meta.limit).toBe(100)
  })

  it("keeps branch when creating admin users", () => {
    const deps = createRepositorySpy()

    createUserRecord(
      {
        name: "Owner",
        email: "owner@example.com",
        password: "StrongPass123",
        role: "admin-penjualan",
        branch: "cabang-a",
      },
      { repository: deps.repository }
    )

    expect(deps.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "admin-penjualan",
        branch: "cabang-a",
      })
    )
  })

  it("keeps branch for viewer users", () => {
    const deps = createRepositorySpy()

    createUserRecord(
      {
        name: "Kasir",
        email: "kasir@example.com",
        password: "StrongPass123",
        role: "viewer",
        branch: "cabang-a",
      },
      { repository: deps.repository }
    )

    expect(deps.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "viewer",
        branch: "cabang-a",
      })
    )
  })

  it("builds patch payload with only allowed fields", () => {
    const deps = createRepositorySpy()

    patchUserRecord(
      "u-1",
      {
        name: "Kasir Update",
        active: "yes" as unknown as boolean,
      },
      { repository: deps.repository }
    )

    expect(deps.patchUser).toHaveBeenCalledWith("u-1", {
      name: "Kasir Update",
    })
  })

  it("delegates delete and password update operations", () => {
    const deps = createRepositorySpy()

    removeUserRecord("u-1", { repository: deps.repository })
    changeUserPassword("u-1", "StrongPass123", { repository: deps.repository })

    expect(deps.removeUser).toHaveBeenCalledWith("u-1")
    expect(deps.changePassword).toHaveBeenCalledWith("u-1", "StrongPass123")
  })
})