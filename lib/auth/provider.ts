export type AuthProvider = "mock" | "jwt"

type JwtCookieNames = {
  accessName: string
  roleName: string
  branchName: string
}

function readFirstDefinedEnv(keys: ReadonlyArray<string>): string | undefined {
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return undefined
}

export function getAuthProvider(): AuthProvider {
  const provider = String(process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "").trim().toLowerCase()

  if (provider === "jwt") return "jwt"
  if (provider === "mock") return "mock"

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_PROVIDER_MISCONFIGURED")
  }

  return "mock"
}

export function getJwtCookieNames(): JwtCookieNames {
  return {
    accessName: readFirstDefinedEnv(["JWT_ACCESS_COOKIE", "NEXT_PUBLIC_JWT_ACCESS_COOKIE"]) || "access_token",
    roleName: readFirstDefinedEnv(["JWT_ROLE_COOKIE", "NEXT_PUBLIC_JWT_ROLE_COOKIE"]) || "role",
    branchName: readFirstDefinedEnv(["JWT_BRANCH_COOKIE", "NEXT_PUBLIC_JWT_BRANCH_COOKIE"]) || "branch",
  }
}