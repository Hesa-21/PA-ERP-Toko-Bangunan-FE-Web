import { canAccessBranch } from "@/lib/auth/branch-access"
import { requirePermission } from "@/lib/auth/guards"
import { getBranchById } from "@/lib/single-branch"
import { jsonError } from "@/lib/http/response"

type PermissionGuard = ReturnType<typeof requirePermission>

export function requireSalesReadGuard(request: Request): PermissionGuard {
  return requirePermission(request, "sales", "R")
}

export function requireSalesDeleteGuard(request: Request): PermissionGuard {
  return requirePermission(request, "sales", "D")
}

export function ensureSalesBranchAccess(guard: PermissionGuard, branch: string) {
  if (!guard.ok) return guard.response

  const targetBranch = (branch ?? "").trim()

  if (!canAccessBranch(guard.data.user.branch, targetBranch, guard.data.user.role)) {
    return jsonError({ code: "FORBIDDEN", message: "Forbidden", status: 403 })
  }

  if (!getBranchById(targetBranch)) {
    return jsonError({ code: "NOT_FOUND", message: "Branch not found", status: 404 })
  }

  return null
}
