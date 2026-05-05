import { z } from "zod"
import type { Role } from "@/lib/auth/rbac"
import { getPasswordErrorCode, normalizeEmail } from "@/lib/auth/user-validation"

const ROLE_VALUES: Role[] = ["admin-penjualan", "viewer"]
const STATUS_VALUES = ["all", "active", "inactive"] as const
const USERS_LIST_MAX_LIMIT = 200

export type UsersStatusValue = (typeof STATUS_VALUES)[number]

function isRole(value: string): value is Role {
  return (ROLE_VALUES as string[]).includes(value)
}

function isStatus(value: string): value is UsersStatusValue {
  return (STATUS_VALUES as readonly string[]).includes(value)
}

export type UsersListRouteQuery = {
  q: string
  role: Role | "all"
  status: UsersStatusValue
  page?: number
  limit?: number
  invalidPageParam: boolean
  invalidLimitParam: boolean
}

export function parseUsersListRouteQuery(url: URL):
  | { ok: true; data: UsersListRouteQuery }
  | { ok: false; error: string } {
  const q = (url.searchParams.get("q") ?? "").trim()
  const roleRaw = (url.searchParams.get("role") ?? "all").trim()
  const statusRaw = (url.searchParams.get("status") ?? "all").trim()

  const role = roleRaw === "all" ? "all" : isRole(roleRaw) ? roleRaw : null
  if (role === null) return { ok: false, error: "Invalid role filter" }

  const status = isStatus(statusRaw) ? statusRaw : null
  if (status === null) return { ok: false, error: "Invalid status filter" }

  const pageParam = (url.searchParams.get("page") ?? "").trim()
  const limitParam = (url.searchParams.get("limit") ?? "").trim()

  const pageIsInteger = /^[0-9]+$/.test(pageParam)
  const limitIsInteger = /^[0-9]+$/.test(limitParam)

  const pageRaw = pageParam ? Number(pageParam) : Number.NaN
  const limitRaw = limitParam ? Number(limitParam) : Number.NaN
  const invalidPageParam = Boolean(pageParam) && (!pageIsInteger || !Number.isFinite(pageRaw) || pageRaw <= 0)
  const invalidLimitParam =
    Boolean(limitParam) &&
    (!limitIsInteger || !Number.isFinite(limitRaw) || limitRaw <= 0 || limitRaw > USERS_LIST_MAX_LIMIT)

  return {
    ok: true,
    data: {
      q,
      role,
      status,
      page: invalidPageParam ? undefined : Number.isFinite(pageRaw) ? pageRaw : undefined,
      limit: invalidLimitParam ? undefined : Number.isFinite(limitRaw) ? limitRaw : undefined,
      invalidPageParam,
      invalidLimitParam,
    },
  }
}

const createUserBodySchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(["admin-penjualan", "viewer"]).optional(),
  branch: z.string().optional(),
})

export type CreateUserBody = z.infer<typeof createUserBodySchema>

export function parseCreateUserBody(raw: unknown):
  | { ok: true; data: CreateUserBody }
  | { ok: false; error: string } {
  const parsed = createUserBodySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Payload pengguna tidak valid." }
  return { ok: true, data: parsed.data }
}

export function validateCreateUserRequired(input: CreateUserBody) {
  const name = String(input.name ?? "").trim()
  const emailRaw = String(input.email ?? "").trim()
  const email = normalizeEmail(emailRaw)
  const password = String(input.password ?? "")
  const role = input.role
  const branch = String(input.branch ?? "").trim() || undefined

  if (!name) {
    return { ok: false as const, error: "Nama pengguna wajib diisi." }
  }
  if (!email) {
    return { ok: false as const, error: "Email wajib diisi." }
  }
  const emailValid = z.string().email().safeParse(email)
  if (!emailValid.success) {
    return { ok: false as const, error: "Format email tidak valid." }
  }
  if (!password) {
    return { ok: false as const, error: "Password wajib diisi." }
  }
  if (getPasswordErrorCode(password)) {
    return {
      ok: false as const,
      error: "Password tidak valid. Minimal 10 karakter dan harus mengandung huruf serta angka.",
    }
  }
  if (!role) {
    return { ok: false as const, error: "Role pengguna wajib diisi." }
  }

  return { ok: true as const, data: { name, email, password, role, branch } }
}

const patchUserBodySchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  active: z.boolean().optional(),
})

export type PatchUserBody = z.infer<typeof patchUserBodySchema>

export function parsePatchUserBody(raw: unknown):
  | { ok: true; data: PatchUserBody }
  | { ok: false; error: string } {
  const parsed = patchUserBodySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Payload update user tidak valid." }

  if (parsed.data.name !== undefined) {
    const name = String(parsed.data.name).trim()
    if (!name) {
      return { ok: false, error: "Nama pengguna tidak boleh kosong." }
    }
  }

  if (parsed.data.email !== undefined) {
    const email = normalizeEmail(parsed.data.email)
    const emailValid = z.string().email().safeParse(email)
    if (!emailValid.success) {
      return { ok: false, error: "Format email tidak valid." }
    }
  }
  return { ok: true, data: parsed.data }
}

export function validateUserIdRequired(id: string) {
  const value = (id ?? "").trim()
  if (!value) return { ok: false as const, error: "id wajib." }
  return { ok: true as const, value }
}

const passwordBodySchema = z.object({
  newPassword: z.string().optional(),
})

export function parsePasswordBody(raw: unknown):
  | { ok: true; data: { newPassword?: string } }
  | { ok: false; error: string } {
  const parsed = passwordBodySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Payload password tidak valid." }
  return { ok: true, data: parsed.data }
}

export function validateNewPasswordRequired(newPassword?: string) {
  const value = String(newPassword ?? "")
  if (!value) return { ok: false as const, error: "Password baru wajib diisi." }
  if (getPasswordErrorCode(value)) {
    return {
      ok: false as const,
      error: "Password tidak valid. Minimal 10 karakter dan harus mengandung huruf serta angka.",
    }
  }
  return { ok: true as const }
}
