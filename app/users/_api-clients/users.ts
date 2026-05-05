import { apiFetchJson } from "@/lib/client/http"
import type { Role } from "@/lib/auth/role"
import type { User, UsersListParams, UsersListResponse, UsersListMeta } from "@/lib/domain/users"

export type { UsersListParams, UsersListResponse }

export type CreateUserInput = {
  name: string
  email: string
  password: string
  role: Role
  branch?: string
}

export type UpdateUserInput = {
  name: string
  email: string
  active: boolean
}

function normalizeListMeta(input: {
  raw?: Partial<UsersListMeta>
  fallback: Required<Pick<UsersListMeta, "q" | "role" | "status" | "page" | "limit">>
}): UsersListMeta {
  const totalRaw = input.raw?.total
  const pageRaw = input.raw?.page
  const limitRaw = input.raw?.limit

  return {
    total: typeof totalRaw === "number" && Number.isFinite(totalRaw) ? Math.max(0, totalRaw) : 0,
    page:
      typeof pageRaw === "number" && Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : input.fallback.page,
    limit:
      typeof limitRaw === "number" && Number.isFinite(limitRaw)
        ? Math.max(1, Math.trunc(limitRaw))
        : input.fallback.limit,
    q: typeof input.raw?.q === "string" ? input.raw.q : input.fallback.q,
    role: (input.raw?.role as UsersListMeta["role"]) ?? input.fallback.role,
    status: (input.raw?.status as UsersListMeta["status"]) ?? input.fallback.status,
  }
}

export async function listUsers(
  params: UsersListParams,
  opts?: { signal?: AbortSignal }
): Promise<UsersListResponse> {
  const qs = new URLSearchParams()

  const q = (params.q ?? "").trim()
  if (q) qs.set("q", q)

  const role = params.role ?? "all"
  const status = params.status ?? "all"
  const page =
    typeof params.page === "number" && Number.isFinite(params.page) ? Math.max(1, Math.trunc(params.page)) : 1
  const limit =
    typeof params.limit === "number" && Number.isFinite(params.limit)
      ? Math.max(1, Math.min(200, Math.trunc(params.limit)))
      : 100

  qs.set("role", String(role))
  qs.set("status", String(status))
  qs.set("page", String(page))
  qs.set("limit", String(limit))

  const data = await apiFetchJson<{ users?: User[]; meta?: Partial<UsersListMeta> }>(
    `/api/users?${qs.toString()}`,
    { method: "GET", signal: opts?.signal },
    { defaultErrorMessage: "Gagal memuat pengguna" }
  )

  return {
    users: Array.isArray(data?.users) ? (data.users as User[]) : [],
    meta: normalizeListMeta({
      raw: data?.meta,
      fallback: {
        q,
        role: role as UsersListMeta["role"],
        status: status as UsersListMeta["status"],
        page,
        limit,
      },
    }),
  }
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const data = await apiFetchJson<{ user?: User }>(
    "/api/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal membuat pengguna" }
  )

  const user = data?.user
  if (!user) throw new Error("Data pengguna tidak ditemukan.")
  return user
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const data = await apiFetchJson<{ user?: User }>(
    `/api/users/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { defaultErrorMessage: "Gagal menyimpan" }
  )

  const user = data?.user
  if (!user) throw new Error("Data pengguna tidak ditemukan.")
  return user
}

export async function setUserPassword(id: string, newPassword: string): Promise<void> {
  await apiFetchJson(
    `/api/users/${encodeURIComponent(id)}/password`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    },
    { defaultErrorMessage: "Gagal mengubah password" }
  )
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetchJson(
    `/api/users/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { defaultErrorMessage: "Gagal menghapus" }
  )
}
