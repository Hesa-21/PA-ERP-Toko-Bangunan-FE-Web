import { getJwtCookieNames } from "@/lib/auth/provider"
import { isRole, type Role } from "@/lib/auth/rbac"
import { readCookieFromHeader } from "@/lib/http/cookies"
import { hmac } from "@noble/hashes/hmac.js"
import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js"
import { utf8ToBytes } from "@noble/hashes/utils.js"

type JwtPayload = Record<string, unknown>

type JwtVerificationConfig = {
  secret: string
  issuer?: string
  audience: string[]
  roleClaim: string
  branchClaim: string
  userIdClaim: string
  nameClaim: string
  emailClaim: string
}

export type VerifiedJwtAuth = {
  accessToken: string
  payload: JwtPayload
  user: {
    id: string
    name: string
    role: Role
    email?: string
    branch?: string
  }
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

function readClaimKeyEnv(name: string, fallback: string): string {
  const fromEnv = readFirstDefinedEnv([name])
  return fromEnv || fallback
}

function readAudienceEnv(): string[] {
  const raw = readFirstDefinedEnv(["JWT_AUDIENCE"])
  if (!raw) return []

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function getJwtVerificationConfig(): JwtVerificationConfig | null {
  const secret = readFirstDefinedEnv(["JWT_SECRET", "AUTH_JWT_SECRET"])
  if (!secret) return null

  return {
    secret,
    issuer: readFirstDefinedEnv(["JWT_ISSUER"]),
    audience: readAudienceEnv(),
    roleClaim: readClaimKeyEnv("JWT_ROLE_CLAIM", "role"),
    branchClaim: readClaimKeyEnv("JWT_BRANCH_CLAIM", "branch"),
    userIdClaim: readClaimKeyEnv("JWT_USER_ID_CLAIM", "sub"),
    nameClaim: readClaimKeyEnv("JWT_NAME_CLAIM", "name"),
    emailClaim: readClaimKeyEnv("JWT_EMAIL_CLAIM", "email"),
  }
}

function normalizeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const requiredPadding = (4 - (normalized.length % 4)) % 4
  return normalized + "=".repeat(requiredPadding)
}

function decodeBase64(base64: string): Uint8Array | null {
  if (typeof atob === "function") {
    try {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    } catch {
      // continue
    }
  }

  if (typeof Buffer !== "undefined") {
    try {
      const buffer = Buffer.from(base64, "base64")
      return new Uint8Array(buffer)
    } catch {
      // continue
    }
  }

  return null
}

function decodeBase64UrlToBytes(value: string): Uint8Array | null {
  return decodeBase64(normalizeBase64Url(value))
}

function decodeBase64UrlToText(value: string): string | null {
  const decoded = decodeBase64UrlToBytes(value)
  if (!decoded) return null

  try {
    return new TextDecoder().decode(decoded)
  } catch {
    return null
  }
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false

  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i] ^ b[i]
  }

  return mismatch === 0
}

function readStringClaim(payload: JwtPayload, key: string): string | undefined {
  const raw = payload[key]
  if (typeof raw !== "string") return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readNumericClaim(payload: JwtPayload, key: string): number | undefined {
  const raw = payload[key]
  if (typeof raw !== "number") return undefined
  if (!Number.isFinite(raw)) return undefined
  return raw
}

function matchesAudienceClaim(rawAudience: unknown, expected: string[]): boolean {
  if (expected.length === 0) return true

  if (typeof rawAudience === "string") {
    return expected.includes(rawAudience)
  }

  if (Array.isArray(rawAudience)) {
    const list = rawAudience.filter((x): x is string => typeof x === "string")
    return expected.some((value) => list.includes(value))
  }

  return false
}

function parseJwtToken(token: string): {
  header: Record<string, unknown>
  payload: JwtPayload
  signingInput: string
  signatureBytes: Uint8Array
} | null {
  const parts = String(token ?? "").split(".")
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null

  const headerText = decodeBase64UrlToText(encodedHeader)
  const payloadText = decodeBase64UrlToText(encodedPayload)
  const signatureBytes = decodeBase64UrlToBytes(encodedSignature)
  if (!headerText || !payloadText || !signatureBytes) return null

  try {
    const header = JSON.parse(headerText) as Record<string, unknown>
    const payload = JSON.parse(payloadText) as JwtPayload

    if (!header || typeof header !== "object") return null
    if (!payload || typeof payload !== "object") return null

    return {
      header,
      payload,
      signingInput: `${encodedHeader}.${encodedPayload}`,
      signatureBytes,
    }
  } catch {
    return null
  }
}

function verifyJwtPayload(accessToken: string): JwtPayload | null {
  const parsed = parseJwtToken(accessToken)
  if (!parsed) return null

  const config = getJwtVerificationConfig()
  if (!config) return null

  const alg = typeof parsed.header.alg === "string" ? parsed.header.alg : ""
  const digest = (() => {
    switch (alg) {
      case "HS256":
        return hmac(sha256, utf8ToBytes(config.secret), utf8ToBytes(parsed.signingInput))
      case "HS384":
        return hmac(sha384, utf8ToBytes(config.secret), utf8ToBytes(parsed.signingInput))
      case "HS512":
        return hmac(sha512, utf8ToBytes(config.secret), utf8ToBytes(parsed.signingInput))
      default:
        return null
    }
  })()

  if (!digest) return null
  if (!timingSafeEqualBytes(digest, parsed.signatureBytes)) return null

  const nowSec = Math.floor(Date.now() / 1000)
  const exp = readNumericClaim(parsed.payload, "exp")
  const nbf = readNumericClaim(parsed.payload, "nbf")

  if (exp !== undefined && nowSec >= exp) return null
  if (nbf !== undefined && nowSec < nbf) return null

  if (config.issuer) {
    const issuer = readStringClaim(parsed.payload, "iss")
    if (issuer !== config.issuer) return null
  }

  if (!matchesAudienceClaim(parsed.payload.aud, config.audience)) return null

  return parsed.payload
}

export function resolveVerifiedJwtAuthFromAccessToken(accessToken: string | undefined): VerifiedJwtAuth | null {
  const token = String(accessToken ?? "").trim()
  if (!token) return null

  const payload = verifyJwtPayload(token)
  if (!payload) return null

  const config = getJwtVerificationConfig()
  if (!config) return null

  const role = readStringClaim(payload, config.roleClaim)
  if (!role || !isRole(role)) return null

  const id =
    readStringClaim(payload, config.userIdClaim) ||
    readStringClaim(payload, "sub") ||
    "jwt-user"

  const name = readStringClaim(payload, config.nameClaim) || "Authenticated User"
  const email = readStringClaim(payload, config.emailClaim)
  const branch = readStringClaim(payload, config.branchClaim)

  return {
    accessToken: token,
    payload,
    user: {
      id,
      name,
      role,
      ...(email ? { email } : {}),
      ...(branch ? { branch } : {}),
    },
  }
}

export function resolveVerifiedJwtAuthFromCookieHeader(cookieHeader: string | null): VerifiedJwtAuth | null {
  const { accessName } = getJwtCookieNames()
  const accessToken = readCookieFromHeader(cookieHeader, accessName)
  return resolveVerifiedJwtAuthFromAccessToken(accessToken)
}
