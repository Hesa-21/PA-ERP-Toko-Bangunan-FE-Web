type ResolveClientIpFromRequestOptions = {
  trustProxy?: boolean
  trustedProxyCidrs?: ReadonlyArray<string>
  trustProxyEnvKeys?: ReadonlyArray<string>
  trustedProxyCidrsEnvKeys?: ReadonlyArray<string>
  fallbackIp?: string
}

type RequestLike = {
  headers: {
    get(name: string): string | null
  }
}

const DEFAULT_TRUST_PROXY_ENV_KEYS = ["TRUST_PROXY_HEADERS"] as const
const DEFAULT_TRUSTED_PROXY_CIDR_KEYS = ["TRUSTED_PROXY_CIDRS"] as const

function readFirstDefinedEnv(keys: ReadonlyArray<string>): string | undefined {
  for (const key of keys) {
    const raw = process.env[key]
    if (typeof raw !== "string") continue
    const trimmed = raw.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

function readBooleanEnv(keys: ReadonlyArray<string>, fallback: boolean): boolean {
  const raw = readFirstDefinedEnv(keys)
  if (!raw) return fallback

  const normalized = raw.toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) return true
  if (["0", "false", "no", "off"].includes(normalized)) return false

  return fallback
}

function readListEnv(keys: ReadonlyArray<string>): string[] {
  const raw = readFirstDefinedEnv(keys)
  if (!raw) return []

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseIpv4ToInt(value: string): number | null {
  const segments = value.split(".")
  if (segments.length !== 4) return null

  let result = 0
  for (const segment of segments) {
    if (!/^\d{1,3}$/.test(segment)) return null
    const octet = Number.parseInt(segment, 10)
    if (octet < 0 || octet > 255) return null
    result = (result << 8) | octet
  }

  return result >>> 0
}

function isLikelyIpv6(value: string): boolean {
  if (!value.includes(":")) return false
  return /^[0-9a-fA-F:.]+$/.test(value)
}

function normalizeIpCandidate(rawValue: string | null | undefined): string | null {
  const raw = String(rawValue ?? "").trim()
  if (!raw) return null

  let value = raw.replace(/^"+|"+$/g, "")

  const lower = value.toLowerCase()
  if (lower.startsWith("for=")) {
    value = value.slice(4).trim()
  }

  if (value.startsWith("[") && value.includes("]")) {
    const endIdx = value.indexOf("]")
    value = value.slice(1, endIdx)
  }

  if (value.startsWith("::ffff:")) {
    value = value.slice(7)
  }

  const zoneIndex = value.indexOf("%")
  if (zoneIndex > 0) {
    value = value.slice(0, zoneIndex)
  }

  if (value.includes(":") && !isLikelyIpv6(value)) {
    const lastColon = value.lastIndexOf(":")
    const hostPart = value.slice(0, lastColon).trim()
    if (parseIpv4ToInt(hostPart) !== null) {
      value = hostPart
    }
  }

  if (parseIpv4ToInt(value) !== null) {
    return value
  }

  if (isLikelyIpv6(value)) {
    return value.toLowerCase()
  }

  return null
}

function parseForwardedForChain(rawForwardedHeader: string | null): string[] {
  const raw = String(rawForwardedHeader ?? "").trim()
  if (!raw) return []

  const chain: string[] = []
  for (const forwardedEntry of raw.split(",")) {
    const directives = forwardedEntry.split(";")
    for (const directive of directives) {
      const normalized = normalizeIpCandidate(directive)
      if (normalized) {
        chain.push(normalized)
        break
      }
    }
  }

  return chain
}

function parseForwardedHeaderChain(headers: RequestLike["headers"]): string[] {
  const xForwardedFor = String(headers.get("x-forwarded-for") ?? "").trim()
  if (xForwardedFor) {
    return xForwardedFor
      .split(",")
      .map((item) => normalizeIpCandidate(item))
      .filter((item): item is string => Boolean(item))
  }

  const xVercelForwardedFor = String(headers.get("x-vercel-forwarded-for") ?? "").trim()
  if (xVercelForwardedFor) {
    return xVercelForwardedFor
      .split(",")
      .map((item) => normalizeIpCandidate(item))
      .filter((item): item is string => Boolean(item))
  }

  return parseForwardedForChain(headers.get("forwarded"))
}

function isIpv4InCidr(ip: string, cidr: string): boolean {
  const [range, rawMask] = cidr.split("/")
  if (!range || !rawMask) return false

  const ipInt = parseIpv4ToInt(ip)
  const rangeInt = parseIpv4ToInt(range)
  if (ipInt === null || rangeInt === null) return false

  const maskBits = Number.parseInt(rawMask, 10)
  if (!Number.isFinite(maskBits) || maskBits < 0 || maskBits > 32) return false

  if (maskBits === 0) return true
  const mask = (0xffffffff << (32 - maskBits)) >>> 0
  return (ipInt & mask) === (rangeInt & mask)
}

function isTrustedByNamedRule(ip: string, rule: string): boolean {
  const ipv4 = parseIpv4ToInt(ip)

  if (rule === "loopback") {
    return ip === "::1" || (ipv4 !== null && isIpv4InCidr(ip, "127.0.0.0/8"))
  }

  if (rule === "linklocal") {
    return (ipv4 !== null && isIpv4InCidr(ip, "169.254.0.0/16")) || ip.startsWith("fe80:")
  }

  if (rule === "private") {
    if (ipv4 !== null) {
      return (
        isIpv4InCidr(ip, "10.0.0.0/8") ||
        isIpv4InCidr(ip, "172.16.0.0/12") ||
        isIpv4InCidr(ip, "192.168.0.0/16")
      )
    }
    return ip.startsWith("fc") || ip.startsWith("fd")
  }

  return false
}

function isTrustedProxy(ip: string, trustedRules: ReadonlyArray<string>): boolean {
  if (trustedRules.length === 0) return false

  const normalizedIp = ip.toLowerCase()
  for (const rawRule of trustedRules) {
    const rule = rawRule.trim().toLowerCase()
    if (!rule) continue

    if (isTrustedByNamedRule(normalizedIp, rule)) {
      return true
    }

    if (rule.includes("/") && parseIpv4ToInt(normalizedIp) !== null && isIpv4InCidr(normalizedIp, rule)) {
      return true
    }

    if (rule === normalizedIp) {
      return true
    }
  }

  return false
}

function resolveFromForwardedChain(chain: ReadonlyArray<string>, trustedRules: ReadonlyArray<string>): string | null {
  if (chain.length === 0) return null
  if (trustedRules.length === 0) return chain[0] ?? null

  // Walk from the nearest proxy (right-most) and skip trusted hops.
  let cursor = chain.length - 1
  while (cursor >= 0 && isTrustedProxy(chain[cursor]!, trustedRules)) {
    cursor -= 1
  }

  if (cursor >= 0) {
    return chain[cursor] ?? null
  }

  return chain[0] ?? null
}

function resolveFromDirectHeaders(headers: RequestLike["headers"]): string | null {
  const directHeaderNames = ["x-real-ip", "cf-connecting-ip", "x-client-ip"]
  for (const name of directHeaderNames) {
    const candidate = normalizeIpCandidate(headers.get(name))
    if (candidate) return candidate
  }
  return null
}

export function resolveClientIpFromRequest(
  request: RequestLike,
  options?: ResolveClientIpFromRequestOptions
): string {
  const trustProxy =
    typeof options?.trustProxy === "boolean"
      ? options.trustProxy
      : readBooleanEnv(options?.trustProxyEnvKeys ?? DEFAULT_TRUST_PROXY_ENV_KEYS, true)

  const trustedProxyCidrs =
    options?.trustedProxyCidrs?.map((item) => item.trim()).filter(Boolean) ??
    readListEnv(options?.trustedProxyCidrsEnvKeys ?? DEFAULT_TRUSTED_PROXY_CIDR_KEYS)

  const forwardedChain = parseForwardedHeaderChain(request.headers)

  if (trustProxy) {
    const forwardedIp = resolveFromForwardedChain(forwardedChain, trustedProxyCidrs)
    if (forwardedIp) return forwardedIp
  }

  const directIp = resolveFromDirectHeaders(request.headers)
  if (directIp) return directIp

  const fallbackForwardedIp = resolveFromForwardedChain(forwardedChain, [])
  if (fallbackForwardedIp) return fallbackForwardedIp

  return options?.fallbackIp ?? "unknown"
}