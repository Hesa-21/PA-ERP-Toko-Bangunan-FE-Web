import { redirect } from "next/navigation"
import { requireSession } from "@/lib/auth/ssr-guard"
import { defaultLandingForRole, hasPermission, isRole } from "@/lib/auth/rbac"

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const roleValue = typeof session?.user?.role === "string" ? session.user.role : ""

  if (!isRole(roleValue)) {
    redirect("/auth/sign-in")
  }

  if (!hasPermission(roleValue, "sales", "R")) {
    redirect(defaultLandingForRole(roleValue))
  }

  return children
}
