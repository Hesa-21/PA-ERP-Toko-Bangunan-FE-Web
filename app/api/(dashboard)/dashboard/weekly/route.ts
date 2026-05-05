import { handleDashboardWeeklyGet } from "@/app/api/(dashboard)/_controller/dashboard-weekly-controller"

export async function GET(request: Request) {
  return handleDashboardWeeklyGet(request)
}
