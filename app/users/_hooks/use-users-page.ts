"use client"

import { useMemo } from "react"
import { ALL_BRANCHES } from "@/lib/single-branch"
import { useToast } from "@/components/ui/use-toast"
import { useUsersController } from "@/app/users/_hooks/use-users-controller"
import { useUsersCreateFlow } from "@/app/users/_hooks/use-users-create-flow"
import { useUsersEditFlow } from "@/app/users/_hooks/use-users-edit-flow"
import { useUsersDeleteFlow } from "@/app/users/_hooks/use-users-delete-flow"

export function useUsersPage() {
  const PAGE_SIZE = 5
  const { toast } = useToast()

  const branchNameByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of ALL_BRANCHES) map.set(b.code, b.name)
    return map
  }, [])

  const controller = useUsersController({
    pageSize: PAGE_SIZE,
    onLoadError: (err) => {
      toast({
        title: "Gagal memuat pengguna",
        description: err instanceof Error ? err.message : "Kesalahan tidak diketahui",
      })
    },
  })

  const {
    users,
    loading,
    loadError,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    reload,
    createUser: apiCreateUser,
    updateUser: apiUpdateUser,
    setUserPassword: apiSetUserPassword,
    deleteUser: apiDeleteUser,
  } = controller

  const createFlow = useUsersCreateFlow({
    notify: toast,
    reload,
    createUserApi: apiCreateUser,
  })

  const editFlow = useUsersEditFlow({
    notify: toast,
    reload,
    updateUserApi: apiUpdateUser,
    setUserPasswordApi: apiSetUserPassword,
  })

  const deleteFlow = useUsersDeleteFlow({
    notify: toast,
    reload,
    deleteUserApi: apiDeleteUser,
  })

  const isMutating =
    createFlow.isCreating ||
    editFlow.isSavingEdit ||
    editFlow.isSettingPassword ||
    deleteFlow.isDeleting

  return {
    branchNameByCode,
    users,
    loading,
    loadError,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    isMutating,

    ...createFlow,
    ...editFlow,
    ...deleteFlow,
  }
}
