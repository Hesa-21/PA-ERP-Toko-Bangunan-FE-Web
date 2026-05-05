import { isRole } from "@/lib/auth/role"
import type { UserRoleFilter, UserStatusFilter } from "@/lib/domain/users"

export function isUserRoleFilter(value: string): value is UserRoleFilter {
  return value === "all" || isRole(value)
}

export function isUserStatusFilter(value: string): value is UserStatusFilter {
  return value === "all" || value === "active" || value === "inactive"
}