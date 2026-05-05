"use client"

import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AuthUser } from '@/lib/domain/auth'
import { getMe } from '@/hooks/auth/_lib/auth-client'
import { ApiRequestError } from '@/lib/client/http'

type AuthNullableUserSetter = Dispatch<SetStateAction<AuthUser | null | undefined>>

function isUnauthorizedSessionError(error: unknown) {
  return error instanceof ApiRequestError && (error.status === 401 || error.status === 403)
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export function useAuthSessionSync(input: {
  initialUser?: AuthUser
  setUser: AuthNullableUserSetter
}) {
  const { initialUser, setUser } = input

  useEffect(() => {
    const controller = new AbortController()
    let mounted = true

    const syncSession = async () => {
      const retryDelayMs = [300, 900] as const

      for (let attempt = 0; attempt <= retryDelayMs.length; attempt += 1) {
        try {
          const data = await getMe({ signal: controller.signal })
          if (!mounted) return
          setUser(data?.user ?? null)
          return
        } catch (error: unknown) {
          if (!mounted || controller.signal.aborted || isAbortError(error)) return

          if (isUnauthorizedSessionError(error)) {
            setUser(null)
            return
          }

          if (attempt >= retryDelayMs.length) {
            setUser(initialUser ?? null)
            return
          }

          await new Promise<void>((resolve) => {
            setTimeout(resolve, retryDelayMs[attempt])
          })
        }
      }
    }

    void syncSession()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [initialUser, setUser])
}