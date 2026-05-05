import { handleSalesPrintGet } from "@/app/api/(sales)/_controller/sales-print-controller"

export async function GET(request: Request) {
  return handleSalesPrintGet(request, { withPrice: false })
}
