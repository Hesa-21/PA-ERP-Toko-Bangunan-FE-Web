import { headers } from "next/headers"
import ClientDashboardPage from "@/app/dashboard/client-page"
import { fetchDashboardSnapshot } from "@/app/dashboard/_lib/dashboard-service"
import { getCentralBranch } from "@/lib/single-branch"

function resolveBaseUrlFromHeaders(h: Headers): string | undefined {
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (!host) return undefined

  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export default async function DashboardPage() {
  const h = await headers()
  const cookieHeader = h.get("cookie")
  const branch = getCentralBranch()
  const baseUrl = resolveBaseUrlFromHeaders(h)

  const initialSnapshot = await fetchDashboardSnapshot({
    branchCode: branch.code,
    baseUrl,
    cookieHeader,
  })

  return (
    <ClientDashboardPage initialSnapshot={initialSnapshot} />
  )
}
