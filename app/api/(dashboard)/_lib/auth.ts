import { canAccessBranch } from "@/lib/auth/branch-access"
import { requirePermission } from "@/lib/auth/guards"
import { jsonError } from "@/lib/http/response"

export function requireDashboardReadGuard(request: Request) {
  return requirePermission(request, "dashboard", "R")
}

export function ensureDashboardBranchAccess(
  guard: ReturnType<typeof requireDashboardReadGuard>,
  branch: string
) {
  if (!guard.ok) return guard.response

  if (!canAccessBranch(guard.data.user.branch, branch, guard.data.user.role)) {
    return jsonError({ code: "FORBIDDEN", message: "Forbidden", status: 403 })
  }

  return null
}
