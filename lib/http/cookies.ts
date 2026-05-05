function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function readCookieFromHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined

  const pattern = new RegExp(`(?:^|;)\\s*${escapeRegExp(name)}=([^;]+)`)
  const match = cookieHeader.match(pattern)
  if (!match?.[1]) return undefined

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}
