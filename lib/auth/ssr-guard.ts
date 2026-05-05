import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { resolveVerifiedJwtAuthFromAccessToken } from "@/lib/auth/jwt"
import { parseSessionCookieValue } from "@/lib/auth/session"
import { getAuthProvider, getJwtCookieNames } from "@/lib/auth/provider"
import { isRole, type Role } from "@/lib/auth/rbac"

export type SessionUser = {
  id: string
  role: string
}

export type SessionPayload = {
  user: SessionUser
  [key: string]: unknown
}

async function parseMockSession(): Promise<SessionPayload | null> {
  const c = await cookies()
  const raw = c.get("mock_session")?.value
  const parsed = parseSessionCookieValue(raw)
  if (!parsed) return null
  return parsed as unknown as SessionPayload
}

async function parseJwtSession(): Promise<SessionPayload | null> {
  const c = await cookies()
  const { accessName } = getJwtCookieNames()
  const access = c.get(accessName)?.value
  const verified = resolveVerifiedJwtAuthFromAccessToken(access)
  if (!verified) return null

  return {
    user: {
      id: verified.user.id,
      role: verified.user.role,
    },
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const provider = getAuthProvider()
  return provider === "jwt" ? await parseJwtSession() : await parseMockSession()
}

export async function requireSession() {
  const s = await getSessionFromCookies()
  if (!s) {
    redirect("/auth/sign-in")
  }
  return s
}

export async function requireRole(roles: ReadonlyArray<Role>) {
  const s = await requireSession()
  const role = s.user.role
  if (role === "unknown") {
    redirect("/auth/sign-in")
  }
  if (!isRole(role)) {
    redirect("/auth/sign-in")
  }
  if (!roles.includes(role)) {
    redirect("/auth/sign-in")
  }
  return s
}
