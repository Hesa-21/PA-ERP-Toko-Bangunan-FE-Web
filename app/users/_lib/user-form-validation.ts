import type { Role } from "@/lib/auth/role"
import { ALL_BRANCHES } from "@/lib/single-branch"

const EMAIL_MAX_LENGTH = 254
const NAME_MAX_LENGTH = 120
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmailInput(value: string) {
  return String(value ?? "").trim().toLowerCase()
}

export function validateUserName(name: string): string | undefined {
  const normalized = String(name ?? "").trim()
  if (!normalized) return "Nama wajib diisi"
  if (normalized.length > NAME_MAX_LENGTH) {
    return `Nama terlalu panjang. Maksimal ${NAME_MAX_LENGTH} karakter.`
  }
  return undefined
}

export function validateUserEmail(email: string): string | undefined {
  const normalized = normalizeEmailInput(email)
  if (!normalized) return "Email wajib diisi"
  if (normalized.length > EMAIL_MAX_LENGTH) {
    return `Email terlalu panjang. Maksimal ${EMAIL_MAX_LENGTH} karakter.`
  }
  if (!SIMPLE_EMAIL_REGEX.test(normalized)) return "Format email tidak valid"
  return undefined
}

export function validateBranchForRole(input: { role: Role; branch: string }): string | undefined {
  void input.role

  const branch = String(input.branch ?? "").trim()
  if (!branch) return "Cabang wajib dipilih"

  const isKnownBranch = ALL_BRANCHES.some((b) => b.code === branch)
  if (!isKnownBranch) return "Cabang tidak valid"

  return undefined
}