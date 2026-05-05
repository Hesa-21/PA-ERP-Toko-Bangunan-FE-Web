import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultLandingForRole, isRole } from '@/lib/auth/rbac'
import { resolveVerifiedJwtAuthFromAccessToken } from '@/lib/auth/jwt'
import { parseSessionCookieValue } from '@/lib/auth/session'
import { getAuthProvider, getJwtCookieNames } from '@/lib/auth/provider'

function readSessionState(req: NextRequest): { hasSession: boolean; role?: string } {
  const provider = getAuthProvider()
  if (provider === 'jwt') {
    const { accessName } = getJwtCookieNames()
    const accessToken = req.cookies.get(accessName)?.value
    if (!accessToken) return { hasSession: false }

    const verified = resolveVerifiedJwtAuthFromAccessToken(accessToken)
    if (!verified) return { hasSession: false }

    return { hasSession: true, role: verified.user.role }
  }

  const rawSession = req.cookies.get('mock_session')?.value
  if (!rawSession) return { hasSession: false }
  const parsed = parseSessionCookieValue(rawSession)
  if (!parsed) return { hasSession: false }

  const role = typeof parsed.user.role === 'string' ? parsed.user.role : undefined
  return { hasSession: true, role }
}

function resolveSignedInLanding(role: string | undefined): string | null {
  if (!role) return null
  if (isRole(role)) return defaultLandingForRole(role)
  return null
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = readSessionState(req)
  const landing = resolveSignedInLanding(session.role)

  // Allowlist with authenticated sign-in redirect.
  const isAuthPath = pathname.startsWith('/auth/sign-in')
  if (isAuthPath) {
    if (!session.hasSession) return NextResponse.next()
    if (!landing) return NextResponse.next()

    const url = req.nextUrl.clone()
    url.pathname = landing
    url.search = ''
    return NextResponse.redirect(url)
  }

  // If no valid session cookie, redirect to sign-in
  if (!session.hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!landing) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Exclude API routes and static assets from proxy
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public/|.*\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)).*)',
  ],
}
