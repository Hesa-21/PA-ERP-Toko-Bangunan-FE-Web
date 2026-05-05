"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { AuthUser } from '@/lib/domain/auth'
import { useAuthSessionSync } from '@/hooks/auth/use-auth-session-sync'
import { useAuthRedirectGuard } from '@/hooks/auth/use-auth-redirect-guard'
import { useAuthLogout } from '@/hooks/auth/use-auth-logout'

export type { AuthUser }

type AuthContextValue = {
  user: AuthUser | null | undefined // undefined = loading, null = unauthenticated
  isLoading: boolean
  setUser: (u: AuthUser | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser?: AuthUser
}) {
  const [user, setUser] = useState<AuthUser | null | undefined>(initialUser)

  useAuthSessionSync({ initialUser, setUser })
  useAuthRedirectGuard(user)

  const logout = useAuthLogout(setUser)
  const setContextUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser)
  }, [])

  const isLoading = user === undefined
  const contextValue = useMemo(
    () => ({ user, isLoading, setUser: setContextUser, logout }),
    [user, isLoading, setContextUser, logout]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
