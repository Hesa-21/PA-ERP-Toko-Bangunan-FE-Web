"use client"

import { useState } from "react"
import type { User } from "@/lib/domain/users"

type NotifyFn = (input: { title: string; description?: string }) => void

type UsersDeleteFlowInput = {
  notify: NotifyFn
  reload: () => void
  deleteUserApi: (id: string) => Promise<void>
}

export function useUsersDeleteFlow(input: UsersDeleteFlowInput) {
  const { notify, reload, deleteUserApi } = input

  const [openDelete, setOpenDelete] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function confirmDelete() {
    if (isDeleting) return
    if (!deletingUser) return

    setIsDeleting(true)
    try {
      await deleteUserApi(deletingUser.id)
    } catch (err: unknown) {
      notify({
        title: "Gagal menghapus",
        description: err instanceof Error ? err.message : "Kesalahan tidak diketahui",
      })
      return
    } finally {
      setIsDeleting(false)
    }

    setDeletingUser(null)
    setOpenDelete(false)
    reload()
    notify({ title: "Pengguna dihapus" })
  }

  return {
    openDelete,
    setOpenDelete,
    deletingUser,
    setDeletingUser,
    isDeleting,
    confirmDelete,
  }
}