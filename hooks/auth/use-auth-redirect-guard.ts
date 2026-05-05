"use client"

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { AuthUser } from '@/lib/domain/auth'

export function useAuthRedirectGuard(user: AuthUser | null | undefined) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (user === undefined) return
    const isAuthPath = pathname?.startsWith('/auth/sign-in')
    if (!isAuthPath && user === null) {
      router.replace('/auth/sign-in')
    }
  }, [user, pathname, router])
}