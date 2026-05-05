import { jsonError } from "@/lib/http/response"
import { getBranchByCode, getBranchById } from "@/lib/single-branch"
import { resolveVerifiedJwtAuthFromCookieHeader } from "@/lib/auth/jwt"
import { parseSessionFromCookies, type SessionPayload } from "@/lib/auth/session"
import { getAuthProvider } from "@/lib/auth/provider"
import { hasPermission, isRole, type CrudAction, type ModuleKey, type Role } from "@/lib/auth/rbac"
import type { NextResponse } from "next/server"

export type GuardResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

export type GuardUser = {
  id: string
  name: string
  role: Role
  email?: string
  branch?: string
}

export type GuardSession = SessionPayload | { provider: "jwt"; user: GuardUser }

export type GuardPermissionData = {
  user: GuardUser
  session: GuardSession
}

function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeGuardUser(value: unknown): GuardUser | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  const id = readNonEmptyString(record.id)
  const roleValue = readNonEmptyString(record.role)

  if (!id || !roleValue || !isRole(roleValue)) return null

  const name = readNonEmptyString(record.name) ?? "Authenticated User"
  const email = readNonEmptyString(record.email)
  const branch = readNonEmptyString(record.branch)

  return {
    id,
    name,
    role: roleValue,
    ...(email ? { email } : {}),
    ...(branch ? { branch } : {}),
  }
}

function resolveMockGuardSession(cookieHeader: string | null): GuardPermissionData | null {
  const session = parseSessionFromCookies(cookieHeader)
  if (!session) return null

  const user = normalizeGuardUser(session.user)
  if (!user) return null

  return { user, session }
}

function resolveJwtGuardSession(cookieHeader: string | null): GuardPermissionData | null {
  const verified = resolveVerifiedJwtAuthFromCookieHeader(cookieHeader)
  if (!verified) return null

  const branchCookie = verified.user.branch
  const resolvedBranch =
    typeof branchCookie === "string"
      ? getBranchByCode(branchCookie) || getBranchById(branchCookie)
      : undefined

  const user: GuardUser = {
    id: verified.user.id,
    name: verified.user.name,
    role: verified.user.role,
    ...(verified.user.email ? { email: verified.user.email } : {}),
    ...(resolvedBranch ? { branch: resolvedBranch.code } : {}),
  }

  return {
    user,
    session: {
      provider: "jwt",
      user,
    },
  }
}

function requireSessionForPermission(request: Request): GuardResult<GuardPermissionData> {
  const cookieHeader = request.headers.get("cookie")
  const provider = getAuthProvider()

  const sessionData =
    provider === "jwt"
      ? resolveJwtGuardSession(cookieHeader)
      : resolveMockGuardSession(cookieHeader)

  if (!sessionData) {
    return { ok: false, response: jsonError({ code: "UNAUTHORIZED", message: "Unauthorized", status: 401 }) }
  }

  return { ok: true, data: sessionData }
}

export function requirePermission(
  request: Request,
  moduleKey: ModuleKey,
  action: CrudAction
): GuardResult<GuardPermissionData> {
  const res = requireSessionForPermission(request)
  if (!res.ok) return res

  const role = res.data.user.role
  if (!hasPermission(role, moduleKey, action)) {
    return { ok: false, response: jsonError({ code: "FORBIDDEN", message: "Forbidden", status: 403 }) }
  }

  return { ok: true, data: { user: res.data.user, session: res.data.session } }
}
