import { handleSaleDetailDelete, handleSaleDetailGet } from "@/app/api/(sales)/_controller/sales-controller"

export async function GET(request: Request, ctx: { params: Promise<{ saleId: string }> }) {
  return handleSaleDetailGet(request, ctx)
}

export async function DELETE(request: Request, ctx: { params: Promise<{ saleId: string }> }) {
  return handleSaleDetailDelete(request, ctx)
}
