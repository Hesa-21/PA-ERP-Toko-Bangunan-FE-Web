import { defaultLandingForRole } from "@/lib/auth/rbac"
import { apiFetchJson } from "@/lib/client/http"
import type { AuthUserData } from "@/lib/domain/auth"

type LoginResponse = {
  ok?: boolean
  user?: AuthUserData
  session?: unknown
}

export async function signInRequest(input: { email: string; password: string }) {
  const data = await apiFetchJson<LoginResponse>(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password }),
    },
    { defaultErrorMessage: "Email atau kata sandi salah" }
  )

  const user = data?.user
  if (!user) throw new Error("Data pengguna tidak ditemukan.")

  return {
    user,
    redirectTo: defaultLandingForRole(user.role),
  }
}
