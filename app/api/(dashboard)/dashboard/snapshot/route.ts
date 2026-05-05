import { handleDashboardSnapshotGet } from "@/app/api/(dashboard)/_controller/dashboard-snapshot-controller"

export async function GET(request: Request) {
  return handleDashboardSnapshotGet(request)
}
