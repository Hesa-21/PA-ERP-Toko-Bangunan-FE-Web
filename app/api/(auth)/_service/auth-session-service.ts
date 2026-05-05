import { parseSessionFromCookies, serializeExpiredSessionCookie } from "@/lib/auth/session"
import { resolveVerifiedJwtAuthFromCookieHeader } from "@/lib/auth/jwt"
import { getBranchByCode, getBranchById } from "@/lib/single-branch"
import { SELECTED_BRANCH_ID_KEY } from "@/lib/storage/keys"
import { getAuthProvider, getJwtCookieNames } from "@/lib/auth/provider"

function serializeExpiredCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

function resolveJwtSessionFromRequest(input: { cookieHeader: string | null }) {
  const verified = resolveVerifiedJwtAuthFromCookieHeader(input.cookieHeader)
  if (!verified) return { user: null, session: null }

  const branchCookie = verified.user.branch
  const resolvedBranch =
    typeof branchCookie === "string"
      ? getBranchByCode(branchCookie) || getBranchById(branchCookie)
      : undefined

  const user = {
    id: verified.user.id,
    name: verified.user.name,
    ...(verified.user.email ? { email: verified.user.email } : {}),
    role: verified.user.role,
    ...(resolvedBranch ? { branch: resolvedBranch.code } : {}),
  }

  const session = {
    user,
    ...(resolvedBranch
      ? {
          defaultBranch: resolvedBranch.id,
          allowedBranches: [resolvedBranch],
        }
      : {}),
  }

  return {
    user,
    session,
  }
}

export function buildLogoutCookies() {
  const cookies = [
    serializeExpiredSessionCookie(),
    serializeExpiredCookie(SELECTED_BRANCH_ID_KEY),
  ]

  if (getAuthProvider() === "jwt") {
    const { accessName, roleName, branchName } = getJwtCookieNames()
    cookies.push(serializeExpiredCookie(accessName))
    cookies.push(serializeExpiredCookie(roleName))
    cookies.push(serializeExpiredCookie(branchName))
  }

  return cookies
}

export function resolveSessionFromRequest(input: { cookieHeader: string | null }) {
  if (getAuthProvider() === "jwt") {
    return resolveJwtSessionFromRequest(input)
  }

  const session = parseSessionFromCookies(input.cookieHeader)
  const user = session?.user ?? null
  return { user, session: session ?? null }
}
