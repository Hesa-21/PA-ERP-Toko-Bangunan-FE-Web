import { redirect } from "next/navigation"
import SignInClientPage from "@/app/auth/sign-in/client-page"
import { getSessionFromCookies } from "@/lib/auth/ssr-guard"
import { defaultLandingForRole, isRole } from "@/lib/auth/rbac"

function resolveSignedInLanding(role: string | undefined): string | null {
  if (!role) return null
  if (isRole(role)) return defaultLandingForRole(role)
  return null
}

export default async function SignInPage() {
  const session = await getSessionFromCookies()
  if (session?.user?.id) {
    const landing = resolveSignedInLanding(session.user.role)
    if (landing) {
      redirect(landing)
    }
  }

  return <SignInClientPage />
}
