import type { Metadata } from 'next'

const APP_NAME = 'ERP Toko Bangunan'
const APP_DESCRIPTION =
  'Platform operasional toko bangunan untuk penjualan, pembelian, gudang, dan pelaporan.'

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: ['erp', 'toko bangunan', 'point of sale', 'inventory', 'pembelian', 'penjualan'],
  icons: {
    icon: '/react-favicon.svg',
    shortcut: '/react-favicon.svg',
    apple: '/react-favicon.svg',
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
}

import './globals.css'
import { AuthProvider } from '@/hooks/use-auth'
import { Toaster } from '@/components/ui/toaster'
import { cookies } from 'next/headers'
import { resolveVerifiedJwtAuthFromAccessToken } from '@/lib/auth/jwt'
import { parseSessionCookieValue } from '@/lib/auth/session'
import type { AuthUserData } from '@/lib/domain/auth'
import { getBranchByCode, getBranchById } from '@/lib/single-branch'
import { getAuthProvider, getJwtCookieNames } from '@/lib/auth/provider'

type InitialAuthHydration = {
  initialUser?: AuthUserData
}

function resolveMockInitialAuthHydration(rawSession: string | undefined): InitialAuthHydration {
  const parsed = parseSessionCookieValue(rawSession)

  const initialUser = parsed?.user ? (parsed.user as AuthUserData) : undefined

  return {
    initialUser,
  }
}

function resolveJwtInitialAuthHydration(input: {
  accessToken: string | undefined
}): InitialAuthHydration {
  const verified = resolveVerifiedJwtAuthFromAccessToken(input.accessToken)
  if (!verified) return {}

  const branchToken = (verified.user.branch ?? '').trim()
  const resolvedBranch =
    branchToken.length > 0
      ? getBranchByCode(branchToken) || getBranchById(branchToken)
      : undefined

  const initialUser: AuthUserData = {
    id: verified.user.id,
    name: verified.user.name,
    role: verified.user.role,
    ...(verified.user.email ? { email: verified.user.email } : {}),
    ...(resolvedBranch ? { branch: resolvedBranch.code } : {}),
  }

  return {
    initialUser,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const authProvider = getAuthProvider()

  const initialAuthHydration =
    authProvider === 'jwt'
      ? (() => {
          const { accessName } = getJwtCookieNames()
          return resolveJwtInitialAuthHydration({
            accessToken: cookieStore.get(accessName)?.value,
          })
        })()
      : resolveMockInitialAuthHydration(cookieStore.get('mock_session')?.value)

  const initialUser = initialAuthHydration.initialUser

  return (
    <html lang="id">
      <head />
      <body suppressHydrationWarning>
        <AuthProvider initialUser={initialUser}>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
