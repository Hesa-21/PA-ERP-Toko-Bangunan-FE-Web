import { handleDashboardRecentGet } from "@/app/api/(dashboard)/_controller/dashboard-recent-controller"

export async function GET(request: Request) {
  return handleDashboardRecentGet(request)
}
