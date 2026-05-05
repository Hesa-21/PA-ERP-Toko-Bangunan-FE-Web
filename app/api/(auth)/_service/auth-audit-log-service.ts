import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js"

type AuthLoginAuditStatus = "SUCCESS" | "FAILED" | "THROTTLED"

type AuthLoginAuditInput = {
  status: AuthLoginAuditStatus
  reason: string
  email?: string
  clientIp?: string
  retryAfterSec?: number
}

const TRUE_VALUES = new Set(["1", "true", "yes", "on"])
const FALSE_VALUES = new Set(["0", "false", "no", "off"])

function parseBooleanEnv(raw: string | undefined): boolean | undefined {
  const normalized = String(raw ?? "").trim().toLowerCase()
  if (!normalized) return undefined
  if (TRUE_VALUES.has(normalized)) return true
  if (FALSE_VALUES.has(normalized)) return false
  return undefined
}

function isAuditEnabled() {
  const explicit = parseBooleanEnv(process.env.AUTH_AUDIT_LOG)
  if (typeof explicit === "boolean") return explicit

  const nodeEnv = String(process.env.NODE_ENV ?? "").trim().toLowerCase()
  return nodeEnv === "production"
}

function fingerprint(value: string | undefined): string | undefined {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (!normalized) return undefined

  const digest = sha256(utf8ToBytes(normalized))
  return bytesToHex(digest).slice(0, 16)
}

export function logAuthLoginAudit(input: AuthLoginAuditInput) {
  if (!isAuditEnabled()) return

  const payload = {
    domain: "auth",
    ts: new Date().toISOString(),
    event: "AUTH_LOGIN",
    status: input.status,
    reason: input.reason,
    emailHash: fingerprint(input.email),
    ipHash: fingerprint(input.clientIp),
    retryAfterSec: typeof input.retryAfterSec === "number" ? input.retryAfterSec : undefined,
  }

  const line = `[auth-audit] ${JSON.stringify(payload)}`
  if (input.status === "SUCCESS") {
    console.info(line)
    return
  }

  console.warn(line)
}