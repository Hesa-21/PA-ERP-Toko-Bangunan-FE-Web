import type { Role } from "@/lib/auth/rbac"

export type AuthUserData = {
  id: string
  name: string
  email?: string
  role: Role
  branch?: string
}

export type AuthUser = AuthUserData | null