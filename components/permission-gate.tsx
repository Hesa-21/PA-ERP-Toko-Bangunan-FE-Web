"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { canView, defaultLandingForRole, type ModuleKey, type Role } from '@/lib/auth/rbac'

export function PermissionGate({ module, children }: { module: ModuleKey, children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()

  const role: Role = (user?.role as Role | undefined) ?? 'viewer'
  const allowed = canView(role, module)

  useEffect(() => {
    // If unauthenticated, AuthProvider handles redirect to sign-in.
    if (user === null) return

    if (user !== undefined && !allowed) {
      router.replace(defaultLandingForRole(role))
    }
  }, [user, allowed, role, router])

  // Loading state: don't render anything yet
  if (user === undefined) {
    return null
  }

  if (!allowed) return null

  return <>{children}</>
}
