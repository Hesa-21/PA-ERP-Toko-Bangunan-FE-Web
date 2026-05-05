"use client"

import { useState } from "react"
import { getPasswordErrorCode } from "@/lib/auth/user-validation"
import type { UpdateUserInput } from "@/app/users/_api-clients/users"
import type { User } from "@/lib/domain/users"
import { normalizeEmailInput, validateUserEmail, validateUserName } from "@/app/users/_lib/user-form-validation"

type NotifyFn = (input: { title: string; description?: string }) => void

type UsersEditFlowInput = {
  notify: NotifyFn
  reload: () => void
  updateUserApi: (id: string, input: UpdateUserInput) => Promise<unknown>
  setUserPasswordApi: (id: string, newPassword: string) => Promise<void>
}

export function useUsersEditFlow(input: UsersEditFlowInput) {
  const { notify, reload, updateUserApi, setUserPasswordApi } = input

  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  const [eName, setEName] = useState("")
  const [eEmail, setEEmail] = useState("")
  const [eActive, setEActive] = useState<boolean>(true)
  const [eNewPassword, setENewPassword] = useState("")
  const [eConfirmPassword, setEConfirmPassword] = useState("")
  const [eShowNewPassword, setEShowNewPassword] = useState(false)
  const [eShowConfirmPassword, setEShowConfirmPassword] = useState(false)

  function openEditDialog(user: User) {
    setEditing(user)
    setEName(user.name)
    setEEmail(user.email)
    setEActive(user.active)
    setENewPassword("")
    setEConfirmPassword("")
    setOpenEdit(true)
  }

  async function saveEdit() {
    if (isSavingEdit) return
    if (!editing) return

    const name = String(eName ?? "").trim()
    const email = normalizeEmailInput(eEmail)

    const nameError = validateUserName(name)
    if (nameError) {
      notify({ title: nameError })
      return
    }

    const emailError = validateUserEmail(email)
    if (emailError) {
      notify({ title: emailError })
      return
    }

    const payload: UpdateUserInput = { name, email, active: eActive }

    setIsSavingEdit(true)
    try {
      await updateUserApi(editing.id, payload)
    } catch (err: unknown) {
      notify({
        title: "Gagal menyimpan",
        description: err instanceof Error ? err.message : "Kesalahan tidak diketahui",
      })
      return
    } finally {
      setIsSavingEdit(false)
    }

    setOpenEdit(false)
    setEditing(null)
    reload()
    notify({ title: "Perubahan disimpan" })
  }

  async function setNewPassword() {
    if (isSettingPassword) return
    if (!editing) return
    if (!eNewPassword.trim()) {
      notify({ title: "Password baru kosong", description: "Isi password baru terlebih dahulu." })
      return
    }
    if (getPasswordErrorCode(eNewPassword)) {
      notify({
        title: "Password baru tidak valid",
        description: "Minimal 10 karakter dan harus mengandung huruf serta angka.",
      })
      return
    }
    if (eNewPassword !== eConfirmPassword) {
      notify({ title: "Konfirmasi tidak cocok", description: "Password baru dan konfirmasi harus sama." })
      return
    }

    setIsSettingPassword(true)
    try {
      await setUserPasswordApi(editing.id, eNewPassword)
    } catch (err: unknown) {
      notify({
        title: "Gagal mengubah password",
        description: err instanceof Error ? err.message : "Kesalahan tidak diketahui",
      })
      return
    } finally {
      setIsSettingPassword(false)
    }

    setENewPassword("")
    setEConfirmPassword("")
    notify({ title: "Password diubah", description: "Password pengguna berhasil diperbarui." })
  }

  return {
    openEdit,
    setOpenEdit,
    editing,
    isSavingEdit,
    isSettingPassword,
    eName,
    setEName,
    eEmail,
    setEEmail,
    eActive,
    setEActive,
    eNewPassword,
    setENewPassword,
    eConfirmPassword,
    setEConfirmPassword,
    eShowNewPassword,
    setEShowNewPassword,
    eShowConfirmPassword,
    setEShowConfirmPassword,
    openEditDialog,
    saveEdit,
    setNewPassword,
  }
}