import type { Role } from "@/lib/auth/role"
import { createUser, deleteUser, listUsers, setUserPassword, updateUser } from "@/lib/server/mock-db"
import type { User, UsersListResponse } from "@/lib/domain/users"
import type { UsersListRouteQuery } from "@/app/api/(users)/_lib/validators"

export type CreateUserRepoInput = {
  name: string
  email: string
  password: string
  role: Role
  branch?: string
}

export type PatchUserRepoInput = {
  name?: string
  email?: string
  active?: boolean
}

export type UsersRepository = {
  listUsers: (query: UsersListRouteQuery) => UsersListResponse
  createUser: (input: CreateUserRepoInput) => User
  patchUser: (id: string, patch: PatchUserRepoInput) => User | null
  removeUser: (id: string) => boolean
  changePassword: (id: string, newPassword: string) => boolean
}

export function createMockUsersRepository(): UsersRepository {
  return {
    listUsers(query) {
      return listUsers(query)
    },
    createUser(input) {
      return createUser(input)
    },
    patchUser(id, patch) {
      return updateUser(id, patch)
    },
    removeUser(id) {
      return deleteUser(id)
    },
    changePassword(id, newPassword) {
      return setUserPassword(id, newPassword)
    },
  }
}