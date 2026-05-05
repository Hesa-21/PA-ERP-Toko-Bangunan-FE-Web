"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DashboardSnapshot } from "@/app/dashboard/_lib/dashboard-types"
import { fetchDashboardSnapshot } from "@/app/dashboard/_lib/dashboard-service"

export function useDashboardSnapshot(input?: {
  initialSnapshot?: DashboardSnapshot
  branchCode?: string
}) {
  const branchCode = input?.branchCode
  const shouldSkipInitialFetchRef = useRef(Boolean(input?.initialSnapshot))
  const latestRequestIdRef = useRef(0)
  const activeControllerRef = useRef<AbortController | null>(null)

  const [snapshot, setSnapshot] = useState<DashboardSnapshot | undefined>(input?.initialSnapshot)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const loadSnapshot = useCallback(async () => {
    if (!branchCode) {
      latestRequestIdRef.current += 1
      activeControllerRef.current?.abort()
      activeControllerRef.current = null
      setSnapshot(undefined)
      setError("")
      setIsLoading(false)
      return
    }

    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    activeControllerRef.current?.abort()
    const controller = new AbortController()
    activeControllerRef.current = controller

    setIsLoading(true)
    setError("")

    try {
      const data = await fetchDashboardSnapshot({ branchCode, signal: controller.signal })

      if (latestRequestIdRef.current !== requestId) return

      if (!data) {
        setError("Gagal memuat data terbaru dashboard. Menampilkan data terakhir yang tersedia.")
        return
      }

      setSnapshot(data)
    } catch (err: unknown) {
      if (latestRequestIdRef.current !== requestId) return

      if (controller.signal.aborted) return

      setError(err instanceof Error ? err.message : "Gagal memuat dashboard")
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsLoading(false)
      }

      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null
      }
    }
  }, [branchCode])

  useEffect(() => {
    if (shouldSkipInitialFetchRef.current) {
      shouldSkipInitialFetchRef.current = false
      return
    }

    shouldSkipInitialFetchRef.current = false
    void loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    return () => {
      activeControllerRef.current?.abort()
      activeControllerRef.current = null
    }
  }, [])

  return {
    snapshot,
    isLoading,
    error,
    reload: loadSnapshot,
    branchCode,
  }
}
