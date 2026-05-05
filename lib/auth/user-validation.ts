import type { Role } from "@/lib/auth/rbac"
import { getBranchByCode, getCentralBranch } from "@/lib/single-branch"

const PASSWORD_MIN_LENGTH = 10

export function normalizeEmail(email: string): string {
  return (email ?? "").trim().toLowerCase()
}

export function getPasswordErrorCode(password: string): "INVALID_PASSWORD" | undefined {
  const p = String(password ?? "")
  const hasMinLength = p.length >= PASSWORD_MIN_LENGTH
  const hasLetter = /[A-Za-z]/.test(p)
  const hasDigit = /\d/.test(p)
  return hasMinLength && hasLetter && hasDigit ? undefined : "INVALID_PASSWORD"
}

export function getBranchPolicyErrorCode(input: {
  role: Role
  branch?: string | null
}): "BRANCH_REQUIRED" | "BRANCH_NOT_FOUND" | undefined {
  void input.role

  const b = (input.branch ?? "").trim()
  if (!b) return undefined

  const branch = getBranchByCode(b)
  const central = getCentralBranch()
  if (!branch || branch.code !== central.code) return "BRANCH_NOT_FOUND"
  return undefined
}
