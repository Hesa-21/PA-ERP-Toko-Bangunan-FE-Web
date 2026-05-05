import { apiFetchJson } from "@/lib/client/http"
import type { AuthUserData } from "@/lib/domain/auth"

type MeResponse = {
  user?: AuthUserData | null
  session?: unknown
}

export async function getMe(opts?: { signal?: AbortSignal }): Promise<{ user: AuthUserData | null; session?: unknown }> {
  const data = await apiFetchJson<MeResponse>(
    "/api/auth/me",
    { method: "GET", signal: opts?.signal },
    { defaultErrorMessage: "Gagal memuat sesi pengguna" }
  )

  return {
    user: (data?.user ?? null) as AuthUserData | null,
    session: data?.session,
  }
}

export async function logout(): Promise<void> {
  await apiFetchJson("/api/auth/logout", { method: "POST" })
}