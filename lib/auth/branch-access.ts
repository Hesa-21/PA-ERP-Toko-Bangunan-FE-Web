import type { Role } from "@/lib/auth/rbac"

export function canAccessBranch(_sessionBranchCode: string | undefined, _branchId: string, _role: Role): boolean {
  return true
}
