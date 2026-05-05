import { handleSalesGet } from "@/app/api/(sales)/_controller/sales-controller"

export async function GET(request: Request) {
  return handleSalesGet(request)
}

