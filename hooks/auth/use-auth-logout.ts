"use client"

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Dispatch, SetStateAction } from 'react'
import type { AuthUser } from '@/lib/domain/auth'
import { logout as apiLogout } from '@/hooks/auth/_lib/auth-client'
import { getAuthProvider, getJwtCookieNames } from '@/lib/auth/provider'
import {
  AUTH_LOGOUT_STORAGE_EXACT_KEYS,
  AUTH_LOGOUT_STORAGE_PREFIX_KEYS,
  SELECTED_BRANCH_ID_KEY,
} from '@/lib/storage/keys'

type AuthUserSetter = Dispatch<SetStateAction<AuthUser | null | undefined>>

function removeExactStorageKeys(storage: Storage, keys: ReadonlyArray<string>) {
  for (const key of keys) {
    storage.removeItem(key)
  }
}

function removeStorageByPrefix(storage: Storage, prefixes: ReadonlyArray<string>) {
  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i)
    if (!key) continue
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      storage.removeItem(key)
    }
  }
}

function clearClientCookie(name: string) {
  try {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
  } catch {
    // ignore
  }
}

function clearAuthCookiesFallback() {
  const cookieNames = new Set<string>(['mock_session', SELECTED_BRANCH_ID_KEY])

  if (getAuthProvider() === 'jwt') {
    const { accessName, roleName, branchName } = getJwtCookieNames()
    cookieNames.add(accessName)
    cookieNames.add(roleName)
    cookieNames.add(branchName)
  }

  for (const name of cookieNames) {
    clearClientCookie(name)
  }
}

export function useAuthLogout(setUser: AuthUserSetter) {
  const router = useRouter()

  return useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // Ignore network/logout API failures and continue best-effort local cleanup.
    }

    clearAuthCookiesFallback()

    setUser(null)

    if (typeof window !== 'undefined') {
      try {
        removeExactStorageKeys(localStorage, AUTH_LOGOUT_STORAGE_EXACT_KEYS)
        removeStorageByPrefix(localStorage, AUTH_LOGOUT_STORAGE_PREFIX_KEYS)

        removeExactStorageKeys(sessionStorage, AUTH_LOGOUT_STORAGE_EXACT_KEYS)
        removeStorageByPrefix(sessionStorage, AUTH_LOGOUT_STORAGE_PREFIX_KEYS)
      } catch {
        // ignore
      }
    }

    router.replace('/auth/sign-in')
  }, [router, setUser])
}