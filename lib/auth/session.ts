import {
  ALL_BRANCHES,
  DEFAULT_BRANCH,
  getBranchByCode,
  getBranchById,
  type Branch,
} from "@/lib/single-branch"
import { resolveVerifiedJwtAuthFromCookieHeader } from "@/lib/auth/jwt"
import { getAuthProvider } from "@/lib/auth/provider"
import { MODULE_LABELS, ROLE_MATRIX, isRole, type ModuleKey, type Permission, type Role } from "@/lib/auth/rbac"
import { SELECTED_BRANCH_ID_KEY } from "@/lib/storage/keys"
import { readCookieFromHeader } from "@/lib/http/cookies"
import { hmac } from "@noble/hashes/hmac.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
  branch?: string
}

export type Session = {
  user: SessionUser
  defaultBranchId: string
  allowedBranches: ReadonlyArray<Branch>
  permissions: Record<ModuleKey, Permission>
  modules: typeof MODULE_LABELS
}

// Keep this payload permissive: prototype cookie may include extra fields
// (allowedBranches/permissions/modules) that different routes may or may not use.
export type SessionPayload = {
  user: SessionUser
  [key: string]: unknown
}

const SESSION_COOKIE_VERSION = "v1"
const DEV_SESSION_COOKIE_SECRET = "dev-session-cookie-secret-change-me"

export function buildSession(user: SessionUser): Session {
  let allowedBranches: Branch[] = []
  let defaultBranchId = ""

  if (user.role === "admin-penjualan") {
    allowedBranches = [...ALL_BRANCHES]
    defaultBranchId = DEFAULT_BRANCH.id
  } else if (user.branch) {
    const userBranch = getBranchByCode(user.branch)
    if (userBranch) {
      allowedBranches = [userBranch]
      defaultBranchId = userBranch.id
    }
  }

  return {
    user,
    defaultBranchId,
    allowedBranches,
    permissions: ROLE_MATRIX[user.role],
    modules: MODULE_LABELS,
  }
}

function isSecureCookieEnabled() {
  return process.env.NODE_ENV === "production"
}

function readFirstDefinedEnv(keys: ReadonlyArray<string>): string | undefined {
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value !== "string") continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

function getSessionCookieSecret(): string | null {
  const fromEnv = readFirstDefinedEnv(["SESSION_COOKIE_SECRET", "AUTH_SESSION_SECRET"])
  if (fromEnv) return fromEnv

  if (process.env.NODE_ENV === "production") return null
  return DEV_SESSION_COOKIE_SECRET
}

function isLegacyUnsignedSessionAllowed(): boolean {
  const flag = String(process.env.ALLOW_LEGACY_UNSIGNED_SESSION_COOKIE ?? "").trim()
  if (flag === "1") return true
  if (flag === "0") return false

  return process.env.NODE_ENV !== "production"
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return mismatch === 0
}

function signSessionPayload(payload: string): string | null {
  const secret = getSessionCookieSecret()
  if (!secret) return null

  const digest = hmac(sha256, utf8ToBytes(secret), utf8ToBytes(payload))
  return bytesToHex(digest)
}

function buildSignedSessionValue(payload: string): string {
  const signature = signSessionPayload(payload)
  if (!signature) {
    throw new Error("SESSION_COOKIE_SECRET_MISSING")
  }

  return `${SESSION_COOKIE_VERSION}.${encodeURIComponent(payload)}.${signature}`
}

function verifyAndDecodeSignedSessionValue(rawValue: string): string | null {
  const prefix = `${SESSION_COOKIE_VERSION}.`
  if (!rawValue.startsWith(prefix)) return null

  const remainder = rawValue.slice(prefix.length)
  const splitAt = remainder.lastIndexOf(".")
  if (splitAt <= 0) return null

  const encodedPayload = remainder.slice(0, splitAt)
  const providedSignature = remainder.slice(splitAt + 1)
  if (!providedSignature) return null

  let payload = ""
  try {
    payload = decodeURIComponent(encodedPayload)
  } catch {
    return null
  }

  const expectedSignature = signSessionPayload(payload)
  if (!expectedSignature) return null
  if (!timingSafeEqualString(providedSignature, expectedSignature)) return null

  return payload
}

function buildSessionCookieDirectives(input: { maxAgeSeconds?: number }) {
  const directives = [
    "Path=/",
    "SameSite=Lax",
    "HttpOnly",
  ]

  if (typeof input.maxAgeSeconds === "number") {
    directives.push(`Max-Age=${Math.max(0, Math.trunc(input.maxAgeSeconds))}`)
  }

  if (isSecureCookieEnabled()) {
    directives.push("Secure")
  }

  return directives.join("; ")
}

export function serializeSessionCookie(session: Session, maxAgeSeconds = 60 * 60 * 24): string {
  const payload = JSON.stringify(session)
  const signed = buildSignedSessionValue(payload)
  return `mock_session=${signed}; ${buildSessionCookieDirectives({ maxAgeSeconds })}`
}

export function serializeExpiredSessionCookie(): string {
  return `mock_session=; ${buildSessionCookieDirectives({ maxAgeSeconds: 0 })}`
}

export function parseSessionCookieValue(rawValue: string | null | undefined): SessionPayload | null {
  if (!rawValue) return null

  if (rawValue.startsWith(`${SESSION_COOKIE_VERSION}.`)) {
    const verifiedPayload = verifyAndDecodeSignedSessionValue(rawValue)
    if (!verifiedPayload) return null

    try {
      const parsed = JSON.parse(verifiedPayload) as unknown
      const p = parsed as SessionPayload
      if (p?.user?.id && isRole(String(p?.user?.role ?? ""))) return p
    } catch {
      // ignore
    }

    return null
  }

  if (!isLegacyUnsignedSessionAllowed()) return null

  // Cookie values may already be decoded depending on the runtime.
  // Try decodeURIComponent first, then fall back to raw JSON parsing.
  const candidates = [rawValue]
  try {
    candidates.unshift(decodeURIComponent(rawValue))
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown
      const p = parsed as SessionPayload
      if (p?.user?.id && isRole(String(p?.user?.role ?? ""))) return p
    } catch {
      // ignore
    }
  }

  return null
}

export function parseSessionFromCookies(cookieHeader: string | null): SessionPayload | null {
  const raw = readCookieFromHeader(cookieHeader, "mock_session")
  return parseSessionCookieValue(raw)
}

function resolveBranchFromJwtCookies(cookieHeader: string | null): Branch | undefined {
  const verified = resolveVerifiedJwtAuthFromCookieHeader(cookieHeader)
  if (!verified) return undefined

  const selectedBranchId = String(readCookieFromHeader(cookieHeader, SELECTED_BRANCH_ID_KEY) ?? "").trim()
  const selectedBranch = selectedBranchId ? getBranchById(selectedBranchId) : undefined

  const branchToken = String(verified.user.branch ?? "").trim()
  const jwtBranch = branchToken ? getBranchByCode(branchToken) || getBranchById(branchToken) : undefined

  if (verified.user.role === "admin-penjualan") {
    return selectedBranch || jwtBranch || DEFAULT_BRANCH
  }

  if (!jwtBranch) return undefined
  if (selectedBranch && selectedBranch.id === jwtBranch.id) {
    return selectedBranch
  }

  return jwtBranch
}

export function resolveBranchFromSessionCookies(cookieHeader: string | null): Branch | undefined {
  const selectedBranchId = readCookieFromHeader(cookieHeader, SELECTED_BRANCH_ID_KEY)
  const parsed = parseSessionFromCookies(cookieHeader)

  const rawAllowed = parsed?.allowedBranches
  const allowedBranches = Array.isArray(rawAllowed)
    ? (rawAllowed as unknown[])
        .filter((x): x is Branch => Boolean(x && typeof x === "object"))
        .map((x) => x as Branch)
    : []

  const allowedIds = new Set(
    allowedBranches
      .map((b) => String(b?.id ?? "").trim())
      .filter(Boolean)
  )

  const defaultBranchId =
    typeof parsed?.defaultBranchId === "string" ? parsed.defaultBranchId.trim() : ""

  const roleValue = typeof parsed?.user?.role === "string" ? parsed.user.role.trim() : ""
  const isAdminPenjualan = roleValue === "admin-penjualan"

  const isAllowed = (branchId: string) => allowedIds.size === 0 || allowedIds.has(branchId)

  const selectedCandidate = String(selectedBranchId ?? "").trim()
  if (selectedCandidate && isAllowed(selectedCandidate)) {
    const selected = getBranchById(selectedCandidate)
    if (selected) return selected
  }

  if (defaultBranchId && isAllowed(defaultBranchId)) {
    const fromDefault = getBranchById(defaultBranchId)
    if (fromDefault) return fromDefault
  }

  if (allowedBranches.length > 0) {
    const firstAllowedId = String(allowedBranches[0]?.id ?? "").trim()
    if (firstAllowedId) {
      const fromAllowed = getBranchById(firstAllowedId)
      if (fromAllowed) return fromAllowed
    }
  }

  const userBranchToken =
    typeof parsed?.user?.branch === "string" ? parsed.user.branch.trim() : ""
  if (userBranchToken) {
    const fromUserBranch = getBranchByCode(userBranchToken) || getBranchById(userBranchToken)
    if (fromUserBranch && isAllowed(fromUserBranch.id)) {
      return fromUserBranch
    }
  }

  return isAdminPenjualan ? DEFAULT_BRANCH : undefined
}

export function resolveBranchFromAuthCookies(cookieHeader: string | null): Branch | undefined {
  if (getAuthProvider() === "jwt") {
    return resolveBranchFromJwtCookies(cookieHeader)
  }

  return resolveBranchFromSessionCookies(cookieHeader)
}
