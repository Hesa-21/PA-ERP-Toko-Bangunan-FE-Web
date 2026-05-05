import type { Role } from "@/lib/auth/role"
import type { PatchUserBody, UsersListRouteQuery } from "@/app/api/(users)/_lib/validators"
import { createMockUsersRepository, type UsersRepository } from "@/app/api/(users)/_service/users-repository"

export type UsersServiceDeps = {
  repository?: UsersRepository
}

const defaultUsersRepository = createMockUsersRepository()

function resolveRepository(deps?: UsersServiceDeps): UsersRepository {
  return deps?.repository ?? defaultUsersRepository
}

export function listUsersFromQuery(query: UsersListRouteQuery, deps?: UsersServiceDeps) {
  return resolveRepository(deps).listUsers(query)
}

export function createUserRecord(input: {
  name: string
  email: string
  password: string
  role: Role
  branch?: string
}, deps?: UsersServiceDeps) {
  return resolveRepository(deps).createUser(input)
}

export function patchUserRecord(id: string, body: PatchUserBody, deps?: UsersServiceDeps) {
  const patch: PatchUserBody = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(typeof body.active === "boolean" ? { active: body.active } : {}),
  }
  return resolveRepository(deps).patchUser(id, patch)
}

export function removeUserRecord(id: string, deps?: UsersServiceDeps) {
  return resolveRepository(deps).removeUser(id)
}

export function changeUserPassword(id: string, newPassword: string, deps?: UsersServiceDeps) {
  return resolveRepository(deps).changePassword(id, newPassword)
}
