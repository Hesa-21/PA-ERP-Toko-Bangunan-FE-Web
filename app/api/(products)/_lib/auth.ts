import { canAccessBranch } from "@/lib/auth/branch-access"
import { requirePermission } from "@/lib/auth/guards"
import type { ModuleKey } from "@/lib/auth/rbac"
import { getBranchById, getCentralBranch } from "@/lib/single-branch"
import { jsonError } from "@/lib/http/response"

type PermissionGuard = ReturnType<typeof requirePermission>

export function requireProductsReadGuard(request: Request): PermissionGuard {
  return requirePermission(request, "categories", "R")
}

export function requireProductsWriteGuard(request: Request): PermissionGuard {
  return requirePermission(request, "categories", "U")
}

export function requireProductsDeleteGuard(request: Request): PermissionGuard {
  return requirePermission(request, "categories", "D")
}

export function requireProductZoneBalancesReadGuard(request: Request): PermissionGuard {
  const modules: ModuleKey[] = ["categories"]
  const guards: PermissionGuard[] = modules.map((m) => requirePermission(request, m, "R"))
  const winner = guards.find((g) => g.ok)
  return winner ?? guards[0]
}

export function ensureBranchAccess(guard: PermissionGuard) {
  if (!guard.ok) return guard.response
  const targetBranch = getCentralBranch().id

  if (!canAccessBranch(guard.data.user.branch, targetBranch, guard.data.user.role)) {
    return jsonError({ code: "FORBIDDEN", message: "Forbidden", status: 403 })
  }

  if (!getBranchById(targetBranch)) {
    return jsonError({ code: "NOT_FOUND", message: "Branch not found", status: 404 })
  }

  return null
}
