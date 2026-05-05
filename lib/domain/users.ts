import type { Role } from '@/lib/auth/role'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  branch?: string
  active: boolean
}

export type UserRoleFilter = 'all' | Role
export type UserStatusFilter = 'all' | 'active' | 'inactive'

export type UsersListParams = {
  q?: string
  role?: UserRoleFilter
  status?: UserStatusFilter
  page?: number
  limit?: number
}

export type UsersListMeta = {
  total: number
  page: number
  limit: number
  q: string
  role: UserRoleFilter
  status: UserStatusFilter
}

export type UsersListResponse = {
  users: User[]
  meta: UsersListMeta
}
