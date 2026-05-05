import { handleSalesPrintGet } from "@/app/api/(sales)/_controller/sales-print-controller"

export async function GET(request: Request, ctx: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await ctx.params
  return handleSalesPrintGet(request, { saleId, withPrice: false })
}