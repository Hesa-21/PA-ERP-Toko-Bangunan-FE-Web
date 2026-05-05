import { requirePermission } from "@/lib/auth/guards"

type PermissionGuard = ReturnType<typeof requirePermission>

export function requireUsersReadGuard(request: Request): PermissionGuard {
  return requirePermission(request, "users", "R")
}

export function requireUsersCreateGuard(request: Request): PermissionGuard {
  return requirePermission(request, "users", "C")
}

export function requireUsersUpdateGuard(request: Request): PermissionGuard {
  return requirePermission(request, "users", "U")
}

export function requireUsersDeleteGuard(request: Request): PermissionGuard {
  return requirePermission(request, "users", "D")
}
