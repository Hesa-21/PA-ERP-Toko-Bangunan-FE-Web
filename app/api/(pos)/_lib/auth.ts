import { canAccessBranch } from "@/lib/auth/branch-access"
import { requirePermission } from "@/lib/auth/guards"
import { jsonError } from "@/lib/http/response"

export function requirePosWriteGuard(request: Request) {
  return requirePermission(request, "pos", "C")
}

export function ensurePosBranchAccess(
  guard: ReturnType<typeof requirePosWriteGuard>,
  branch: string
) {
  if (!guard.ok) return guard.response

  if (!canAccessBranch(guard.data.user.branch, branch, guard.data.user.role)) {
    return jsonError({ code: "FORBIDDEN", message: "Forbidden", status: 403 })
  }

  return null
}
