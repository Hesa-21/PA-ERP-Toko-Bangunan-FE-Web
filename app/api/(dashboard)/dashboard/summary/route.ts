import { handleDashboardSummaryGet } from "@/app/api/(dashboard)/_controller/dashboard-summary-controller"

export async function GET(request: Request) {
  return handleDashboardSummaryGet(request)
}
