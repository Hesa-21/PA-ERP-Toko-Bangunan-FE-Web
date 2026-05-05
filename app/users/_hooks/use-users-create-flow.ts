"use client"

import { useState } from "react"
import type { Role } from "@/lib/auth/role"
import { getPasswordErrorCode } from "@/lib/auth/user-validation"
import type { CreateUserInput } from "@/app/users/_api-clients/users"
import {
  normalizeEmailInput,
  validateBranchForRole,
  validateUserEmail,
  validateUserName,
} from "@/app/users/_lib/user-form-validation"

type NotifyFn = (input: { title: string; description?: string }) => void

type UsersCreateFlowInput = {
  notify: NotifyFn
  reload: () => void
  createUserApi: (input: CreateUserInput) => Promise<unknown>
}

export function useUsersCreateFlow(input: UsersCreateFlowInput) {
  const { notify, reload, createUserApi } = input

  const [openCreate, setOpenCreate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [cName, setCName] = useState("")
  const [cEmail, setCEmail] = useState("")
  const [cPassword, setCPassword] = useState("")
  const [cShowPassword, setCShowPassword] = useState(false)
  const [cRole, setCRole] = useState<Role>("viewer")
  const [cBranch, setCBranch] = useState<string>("cabang-a")

  function resetCreateForm() {
    setCName("")
    setCEmail("")
    setCPassword("")
    setCRole("viewer")
    setCBranch("cabang-a")
  }

  async function createUser() {
    if (isCreating) return

    const name = String(cName ?? "").trim()
    const email = normalizeEmailInput(cEmail)
    const branch = String(cBranch ?? "").trim()

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

    const branchError = validateBranchForRole({ role: cRole, branch })
    if (branchError) {
      notify({ title: branchError })
      return
    }

    if (getPasswordErrorCode(cPassword)) {
      notify({
        title: "Password tidak valid",
        description: "Minimal 10 karakter dan harus mengandung huruf serta angka.",
      })
      return
    }

    const payload: CreateUserInput = {
      name,
      email,
      password: cPassword,
      role: cRole,
      branch,
    }

    setIsCreating(true)
    try {
      await createUserApi(payload)
    } catch (err: unknown) {
      notify({
        title: "Gagal membuat pengguna",
        description: err instanceof Error ? err.message : "Kesalahan tidak diketahui",
      })
      return
    } finally {
      setIsCreating(false)
    }

    setOpenCreate(false)
    resetCreateForm()
    reload()
    notify({ title: "Pengguna dibuat", description: "Akun berhasil dibuat." })
  }

  return {
    openCreate,
    setOpenCreate,
    isCreating,
    cName,
    setCName,
    cEmail,
    setCEmail,
    cPassword,
    setCPassword,
    cShowPassword,
    setCShowPassword,
    cRole,
    setCRole,
    cBranch,
    setCBranch,
    createUser,
  }
}