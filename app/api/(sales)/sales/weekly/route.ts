import { handleSalesWeeklyGet } from "@/app/api/(sales)/_controller/sales-analytics-controller"

export async function GET(request: Request) {
  return handleSalesWeeklyGet(request)
}
