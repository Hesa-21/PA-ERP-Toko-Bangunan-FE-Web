import { buildSession } from "@/lib/auth/session"
import { verifyAuthCredentials } from "@/lib/server/mock-db"

export type AuthLoginSuccess = {
  user: {
    id: string
    name: string
    email: string
    role: string
    branch?: string
  }
  session: ReturnType<typeof buildSession>
}

export function authenticateLogin(input: { email: string; password: string }): AuthLoginSuccess {
  const rawPassword = String(input.password ?? "")
  const found = verifyAuthCredentials({ email: input.email, password: rawPassword })
  if (!found) {
    throw new Error("INVALID_CREDENTIALS")
  }

  const user = {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
    branch: found.branch,
  }
  const session = buildSession(user)

  return { user, session }
}
