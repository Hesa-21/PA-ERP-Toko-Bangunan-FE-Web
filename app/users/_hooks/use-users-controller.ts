"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Role } from "@/lib/auth/role"
import type { User } from "@/lib/domain/users"
import { createUser, deleteUser, listUsers, setUserPassword, updateUser } from "@/app/users/_api-clients/users"

export type UsersControllerParams = {
  pageSize: number
  onLoadError?: (err: unknown) => void
}

export function useUsersController(params: UsersControllerParams) {
  const PAGE_SIZE = params.pageSize
  const onLoadErrorRef = useRef<UsersControllerParams["onLoadError"]>(params.onLoadError)

  useEffect(() => {
    onLoadErrorRef.current = params.onLoadError
  }, [params.onLoadError])

  const [reloadTick, setReloadTick] = useState(0)

  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    const controller = new AbortController()
    let mounted = true

    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        const d = await listUsers(
          {
            q: debouncedSearch,
            role: roleFilter,
            status: statusFilter,
            page,
            limit: PAGE_SIZE,
          },
          { signal: controller.signal }
        )
        if (!mounted) return
        setUsers(d.users)
        setTotal(d.meta.total)
      } catch (err: unknown) {
        if (!mounted) return
        if (controller.signal.aborted) return
        setLoadError(err instanceof Error ? err.message : "Kesalahan tidak diketahui")
        onLoadErrorRef.current?.(err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [debouncedSearch, roleFilter, statusFilter, page, reloadTick, PAGE_SIZE])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(Math.max(0, total) / PAGE_SIZE)), [total, PAGE_SIZE])

  useEffect(() => {
    setPage((prev) => (prev > totalPages ? totalPages : prev))
  }, [totalPages])

  function reload() {
    setReloadTick((x) => x + 1)
  }

  return {
    // list state
    users,
    total,
    loading,
    loadError,
    totalPages,

    // filters
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,

    // pagination
    page,
    setPage,
    pageSize: PAGE_SIZE,

    // refresh
    reload,

    // API actions (no UI side-effects)
    createUser,
    updateUser,
    setUserPassword,
    deleteUser,

    // allow caller to patch list optimistically
    setUsers,
  }
}
