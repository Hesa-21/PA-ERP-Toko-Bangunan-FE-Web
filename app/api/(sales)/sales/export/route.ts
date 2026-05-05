import { handleSalesExportGet } from "@/app/api/(sales)/_controller/sales-export-controller"

export async function GET(request: Request) {
  return handleSalesExportGet(request)
}
